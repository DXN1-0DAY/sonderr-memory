#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <string_view>
#include <termios.h>
#include <unistd.h>
#include <vector>

namespace fs = std::filesystem;

struct Memory { fs::path path; std::string title, body; };

static std::string store_root() {
    if (const char* x = std::getenv("SONDERR_MEMORY_ROOT")) return x;
    if (const char* x = std::getenv("SONDERR_MEMORY_HOME")) return x;
    if (const char* x = std::getenv("HOME")) return std::string(x) + "/.sonderr-memory";
    return ".sonderr-memory";
}

static std::string read(const fs::path& p) { std::ifstream f(p); return {std::istreambuf_iterator<char>(f), {}}; }
static std::string trim(std::string s) { while (!s.empty() && (s.back()=='\n'||s.back()=='\r'||s.back()==' ')) s.pop_back(); return s; }

static Memory load(const fs::path& p) {
    auto text = read(p); std::string title = p.stem().string(), body = text;
    auto first = text.find("title:");
    if (first != std::string::npos) { auto e = text.find('\n', first); title = trim(text.substr(first + 6, e-first-6)); }
    if (auto e = text.find("---", 0); e != std::string::npos) body = text.substr(text.find('\n', e)+1);
    return {p, title, trim(body)};
}

class Terminal {
    termios old_{};
public:
    Terminal() { tcgetattr(STDIN_FILENO, &old_); auto t=old_; t.c_lflag &= ~(ICANON|ECHO); t.c_cc[VMIN]=1; t.c_cc[VTIME]=0; tcsetattr(STDIN_FILENO,TCSANOW,&t); std::cout << "\x1b[?25l\x1b[2J"; }
    ~Terminal() { tcsetattr(STDIN_FILENO,TCSANOW,&old_); std::cout << "\x1b[0m\x1b[?25h\x1b[2J\x1b[H"; }
    void line_mode(bool enabled) { auto t=old_; if(!enabled) { t.c_lflag &= ~(ICANON|ECHO); t.c_cc[VMIN]=1; t.c_cc[VTIME]=0; } tcsetattr(STDIN_FILENO,TCSANOW,&t); }
};

class App {
    fs::path root = store_root(); std::vector<Memory> all, shown; int selected=0; std::string query, notice="Ready";
    void refresh() {
        all.clear(); if (fs::exists(root)) for (auto const& e: fs::recursive_directory_iterator(root))
            if (e.is_regular_file() && (e.path().extension()==".md" || e.path().extension()==".txt")) all.push_back(load(e.path()));
        std::sort(all.begin(),all.end(),[](auto&a,auto&b){return a.path>b.path;}); filter();
    }
    void filter() { shown.clear(); for(auto const& m:all) if(query.empty()||m.title.find(query)!=std::string::npos||m.body.find(query)!=std::string::npos) shown.push_back(m); selected=std::clamp(selected,0,std::max(0,(int)shown.size()-1)); }
    void header(std::string_view s) { std::cout << "\x1b[1;38;5;255m  " << s << "\x1b[0m\n\x1b[38;5;239m  " << std::string(76,'-') << "\x1b[0m\n"; }
    void draw() {
        std::cout << "\x1b[2J\x1b[H"; header("sonderr-memory   /   LOCAL CONTEXT");
        std::cout << "\x1b[38;5;208m  " << shown.size() << " memories\x1b[0m  " << (query.empty()?"":"search: "+query) << "\n\n";
        for(int i=0;i<(int)shown.size()&&i<18;i++) { auto& m=shown[i]; std::cout << (i==selected?"\x1b[48;5;236m\x1b[38;5;255m  › ":"  ") << m.title.substr(0,64) << (i==selected?"\x1b[0m":"") << "\n"; }
        if(shown.empty()) std::cout << "  No memories found. Press n to create one.\n";
        std::cout << "\n\x1b[38;5;239m  " << std::string(76,'-') << "\x1b[0m\n  [j/k] navigate   [enter] open   [/] search   [n] new   [r] refresh   [q] quit\n";
        std::cout << "\x1b[38;5;208m  " << notice << "\x1b[0m\n";
    }
    void detail() { if(shown.empty()) return; std::cout<<"\x1b[2J\x1b[H"; header(shown[selected].title); std::cout<<"\n"<<shown[selected].body<<"\n\n\x1b[38;5;239m  [esc/backspace] back   [q] quit\x1b[0m\n"; char c; while(read(STDIN_FILENO,&c,1)&&c!=27&&c!=127&&c!='q'); }
    void create() { std::cout<<"\x1b[2J\x1b[H"; header("NEW MEMORY"); std::string title, broad, findable, body; std::cout<<"  Precise title: "; std::getline(std::cin,title); if(title.empty()){notice="Cancelled";return;} std::cout<<"  Broad topic:   "; std::getline(std::cin,broad); std::cout<<"  Findable tags: "; std::getline(std::cin,findable); std::cout<<"  Content:       "; std::getline(std::cin,body); auto now=std::chrono::system_clock::to_time_t(std::chrono::system_clock::now()); fs::create_directories(root/"inbox"); auto p=root/"inbox"/(std::to_string(now)+"-memory.md"); std::ofstream out(p); out<<"---\ntitle: "<<title<<"\ntopics: ["<<broad<<"]\ntags: ["<<findable<<"]\n---\n"<<body<<"\n"; notice="Saved "+title; refresh(); }
    void info(std::string_view title, std::string_view text) { std::cout<<"\x1b[2J\x1b[H"; header(title); std::cout<<"\n  "<<text<<"\n\n  Store: "<<root.string()<<"\n  Memories: "<<all.size()<<"\n\n\x1b[38;5;239m  Press any key to return\x1b[0m\n"; char c; read(STDIN_FILENO,&c,1); }
    void start_mcp() { auto log=(root/"mcp.log").string(); std::string cmd="nohup bun run src/mcp-server.ts >>\""+log+"\" 2>&1 &"; int rc=std::system(cmd.c_str()); notice=rc==0?"Separate JS MCP service started; manager remains local":"Could not start MCP service"; }
    void files() { std::cout<<"\x1b[2J\x1b[H"; header("STORE FILES"); int n=0; if(fs::exists(root)) for(auto const& e:fs::recursive_directory_iterator(root)) if(e.is_regular_file()&&n++<28) std::cout<<"  "<<fs::relative(e.path(),root).string()<<"  ("<<e.file_size()<<" bytes)\n"; std::cout<<"\n\x1b[38;5;239m  Every listed file is available to MCP clients via list_files/get_file.\n  Press any key to return\x1b[0m\n"; char c; read(STDIN_FILENO,&c,1); }
    void remove_selected(Terminal& t) { if(shown.empty()) return; t.line_mode(true); std::cout<<"\n  Delete '"<<shown[selected].title<<"'? Type yes: "; std::string answer; std::getline(std::cin,answer); t.line_mode(false); if(answer=="yes"){fs::remove(shown[selected].path); notice="Memory deleted"; refresh();}else notice="Delete cancelled"; }
public:
    void run(){ Terminal t; refresh(); draw(); char c; while(read(STDIN_FILENO,&c,1)){ if(c=='q')break; if(c=='j'||c==66)selected=std::min(selected+1,(int)shown.size()-1); else if(c=='k'||c==65)selected=std::max(0,selected-1); else if(c=='\n')detail(); else if(c=='r'){refresh();notice="Refreshed";} else if(c=='n'){t.line_mode(true); create(); t.line_mode(false);} else if(c=='s')info("SETTINGS","This C++23 manager is local and reads the shared files directly. Configuration is stored in config.json. Edit it for context limits, result limits, labels, and theme settings."); else if(c=='m')start_mcp(); else if(c=='f')files(); else if(c=='x')remove_selected(t); else if(c=='/'){query.clear(); t.line_mode(true); std::cout<<"\n  Search: "; std::getline(std::cin,query); t.line_mode(false); filter();} draw(); }}
};
int main(){ App{}.run(); }
