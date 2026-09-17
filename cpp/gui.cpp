#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/keysym.h>

#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

namespace fs = std::filesystem;

struct Memory {
    fs::path path;
    std::string title;
    std::string body;
    std::string topics;
    std::string tags;
};

struct StoreFile {
    fs::path path;
    std::uintmax_t size{};
};

static std::string store_root() {
    if (const char* value = std::getenv("SONDERR_MEMORY_ROOT")) return value;
    if (const char* value = std::getenv("HOME")) return std::string(value) + "/.sonderr-memory";
    return ".sonderr-memory";
}

static std::string read_file(const fs::path& path) {
    std::ifstream file(path);
    return {std::istreambuf_iterator<char>(file), {}};
}

static std::string trim(std::string value) {
    while (!value.empty() && (value.back() == '\n' || value.back() == '\r' || value.back() == ' ')) value.pop_back();
    return value;
}

static Memory parse_memory(const fs::path& path) {
    const std::string source = read_file(path);
    const auto title_start = source.find("title:");
    const auto title_end = source.find('\n', title_start);
    std::string title = title_start == std::string::npos
        ? path.stem().string()
        : trim(source.substr(title_start + 6, title_end - title_start - 6));
    const auto first_fence = source.find("---");
    const auto second_fence = first_fence == std::string::npos ? std::string::npos : source.find("---", first_fence + 3);
    const std::string body = second_fence == std::string::npos ? source : source.substr(source.find('\n', second_fence) + 1);
    auto field = [&](std::string_view name) {
        const auto start = source.find(std::string(name) + ":");
        if (start == std::string::npos) return std::string{};
        const auto end = source.find('\n', start);
        auto value = trim(source.substr(start + name.size() + 1, end - start - name.size() - 1));
        if (value.size() >= 2 && value.front() == '[' && value.back() == ']') value = value.substr(1, value.size() - 2);
        return value;
    };
    return {path, title, trim(body), field("topics"), field("tags")};
}

static std::vector<Memory> scan_memories() {
    std::vector<Memory> result;
    const fs::path root = store_root();
    if (!fs::exists(root)) return result;
    for (const auto& entry : fs::recursive_directory_iterator(root)) {
        if (entry.is_regular_file() && (entry.path().extension() == ".md" || entry.path().extension() == ".txt")) {
            result.push_back(parse_memory(entry.path()));
        }
    }
    std::sort(result.begin(), result.end(), [](const Memory& a, const Memory& b) { return a.path > b.path; });
    return result;
}

static std::vector<StoreFile> scan_files() {
    std::vector<StoreFile> result;
    const fs::path root = store_root();
    if (!fs::exists(root)) return result;
    for (const auto& entry : fs::recursive_directory_iterator(root)) {
        if (entry.is_regular_file()) result.push_back({entry.path(), entry.file_size()});
    }
    std::sort(result.begin(), result.end(), [](const StoreFile& a, const StoreFile& b) { return a.path < b.path; });
    return result;
}

static std::vector<std::string> lines_for(const std::string& source, std::size_t width) {
    std::vector<std::string> lines;
    std::string line;
    for (char character : source) {
        if (character == '\n' || line.size() >= width) {
            lines.push_back(line);
            line.clear();
        }
        if (character != '\n') line.push_back(character);
    }
    if (!line.empty() || lines.empty()) lines.push_back(line);
    return lines;
}

class Gui {
    Display* display_{};
    Window window_{};
    GC gc_{};
    int screen_{};
    unsigned width_ = 1180;
    unsigned height_ = 760;
    std::vector<Memory> memories_;
    std::vector<Memory> filtered_;
    std::vector<StoreFile> files_;
    int section_ = 0;
    int selected_ = 0;
    int scroll_ = 0;
    int file_selected_ = 0;
    int file_scroll_ = 0;
    int detail_scroll_ = 0;
    bool detail_ = false;
    bool file_detail_ = false;
    bool search_mode_ = false;
    bool create_mode_ = false;
    bool edit_mode_ = false;
    bool delete_mode_ = false;
    int form_field_ = 0;
    std::string search_;
    std::string status_ = "Ready";
    std::string form_title_;
    std::string form_topics_;
    std::string form_tags_;
    std::string form_body_;

    static constexpr int sidebar_width = 250;
    static constexpr int topbar_height = 76;
    static constexpr unsigned bg = 0x11141b;
    static constexpr unsigned panel = 0x191e28;
    static constexpr unsigned sidebar_bg = 0x171b23;
    static constexpr unsigned text = 0xf1f3f7;
    static constexpr unsigned muted = 0x8d98aa;
    static constexpr unsigned accent = 0xff7a18;
    static constexpr unsigned line = 0x2b3341;

    void color(unsigned value) { XSetForeground(display_, gc_, value); }
    void fill(int x, int y, unsigned w, unsigned h, unsigned value) { color(value); XFillRectangle(display_, window_, gc_, x, y, w, h); }
    void label(int x, int y, const std::string& value, unsigned value_color = text) {
        color(value_color);
        XDrawString(display_, window_, gc_, x, y, value.c_str(), static_cast<int>(value.size()));
    }
    void button(int x, int y, int w, const std::string& value, bool primary = false) {
        fill(x, y, w, 38, primary ? accent : 0x2b3341);
        label(x + 16, y + 24, value, primary ? 0x11141b : text);
    }
    void line_at(int x, int y, int end) { color(line); XDrawLine(display_, window_, gc_, x, y, end, y); }
    void refresh_filter() {
        filtered_.clear();
        for (const auto& memory : memories_) {
            if (search_.empty() || memory.title.find(search_) != std::string::npos || memory.body.find(search_) != std::string::npos || memory.path.string().find(search_) != std::string::npos) filtered_.push_back(memory);
        }
        selected_ = std::clamp(selected_, 0, std::max(0, static_cast<int>(filtered_.size()) - 1));
        scroll_ = 0;
    }
    void reload() { memories_ = scan_memories(); files_ = scan_files(); refresh_filter(); status_ = "Loaded " + std::to_string(memories_.size()) + " memories and " + std::to_string(files_.size()) + " files"; }
    void sidebar() {
        fill(0, topbar_height, sidebar_width, height_ - topbar_height, sidebar_bg);
        label(28, 120, "WORKSPACE", muted);
        const char* items[] = {"Memories", "Files", "Settings", "MCP Bridge", "AI Prompt"};
        for (int index = 0; index < 5; ++index) {
            const int y = 142 + index * 54;
            if (index == section_) fill(16, y - 29, sidebar_width - 32, 42, 0x303746);
            if (index == section_) fill(16, y - 29, 4, 42, accent);
            label(38, y, items[index], index == section_ ? text : muted);
        }
        line_at(28, 470, sidebar_width - 28);
        label(28, 502, "SHARED STORE", muted);
        label(28, 532, std::to_string(memories_.size()) + " memories", text);
        label(28, 558, store_root(), muted);
        label(28, height_ - 38, "DXN1-0DAY  •  C++23", muted);
    }
    void topbar() {
        fill(0, 0, width_, topbar_height, panel);
        fill(0, 0, 5, topbar_height, accent);
        label(28, 31, "SONDERR-MEMORY", text);
        label(28, 54, "LOCAL CONTEXT MANAGER", muted);
        fill(static_cast<int>(width_) - 390, 18, 300, 38, 0x222936);
        label(static_cast<int>(width_) - 368, 43, search_mode_ ? ("Search: " + search_) : "Search memories  /", search_mode_ ? text : muted);
        fill(static_cast<int>(width_) - 78, 18, 48, 38, accent);
        label(static_cast<int>(width_) - 64, 43, "+", 0x11141b);
        label(286, 54, status_.substr(0, 76), muted);
    }
    void memory_list() {
        label(286, 120, detail_ && !filtered_.empty() ? filtered_[selected_].title : "All memories", text);
        label(286, 145, std::to_string(filtered_.size()) + " results", accent);
        line_at(286, 166, static_cast<int>(width_) - 28);
        if (detail_ && !filtered_.empty()) {
            label(286, 198, filtered_[selected_].path.string(), muted);
            label(286, 222, "Topics: " + filtered_[selected_].topics, accent);
            label(520, 222, "Tags: " + filtered_[selected_].tags, muted);
            button(static_cast<int>(width_) - 240, 184, 92, "Edit");
            button(static_cast<int>(width_) - 136, 184, 108, "Delete");
            int y = 272;
            const auto rows = lines_for(filtered_[selected_].body, 105);
            for (int index = detail_scroll_; index < static_cast<int>(rows.size()); ++index) {
                const auto& row = rows[index];
                label(286, y, row, text);
                y += 24;
                if (y > static_cast<int>(height_) - 75) break;
            }
            label(286, height_ - 38, "Click Memories to return  •  Esc back  •  R refresh", muted);
            return;
        }
        int y = 198;
        const int visible = static_cast<int>((height_ - 230) / 70);
        for (int index = scroll_; index < static_cast<int>(filtered_.size()) && index < scroll_ + visible; ++index) {
            const auto& memory = filtered_[index];
            if (index == selected_) fill(278, y - 29, width_ - 306, 58, 0x242b37);
            label(298, y, memory.title.substr(0, 86), index == selected_ ? text : 0xd2d8e2);
            label(298, y + 23, memory.path.string().substr(0, 100), muted);
            y += 70;
        }
        if (filtered_.empty()) label(298, 220, "No memories match. Create one with the + button or N.", muted);
        label(286, height_ - 38, "Click a memory to inspect  •  N new memory  •  / search  •  R refresh", muted);
    }
    void files() {
        label(286, 120, file_detail_ && !files_.empty() ? fs::relative(files_[file_selected_].path, store_root()).string() : "Store files", text);
        label(286, 145, "Every markdown, text, config, and index file", accent);
        line_at(286, 166, static_cast<int>(width_) - 28);
        if (file_detail_ && !files_.empty()) {
            const auto rows = lines_for(read_file(files_[file_selected_].path), 105);
            int y = 206;
            for (int index = detail_scroll_; index < static_cast<int>(rows.size()); ++index) {
                label(298, y, rows[index], text);
                y += 22;
                if (y > static_cast<int>(height_) - 75) break;
            }
            button(static_cast<int>(width_) - 140, 184, 112, "Back");
            label(286, height_ - 38, "Mouse wheel scrolls  •  Esc returns to the files list", muted);
            return;
        }
        int y = 198;
        const int visible = static_cast<int>((height_ - 250) / 38);
        for (int index = file_scroll_; index < static_cast<int>(files_.size()) && index < file_scroll_ + visible; ++index) {
            if (index == file_selected_) fill(286, y - 24, width_ - 314, 32, 0x242b37);
            label(298, y, fs::relative(files_[index].path, store_root()).string(), index == file_selected_ ? text : 0xd2d8e2);
            label(static_cast<int>(width_) - 150, y, std::to_string(files_[index].size) + " B", muted);
            y += 38;
        }
        if (files_.empty()) label(298, 220, "The shared store is empty.", muted);
        label(286, height_ - 38, "Click a file to inspect it  •  All local files are available through MCP", muted);
    }
    void settings() {
        label(286, 120, "Settings", text); label(286, 145, "Shared configuration and storage", accent); line_at(286, 166, static_cast<int>(width_) - 28);
        label(298, 210, "Store root", muted); label(298, 238, store_root(), text);
        label(298, 292, "Configuration file", muted); label(298, 320, (fs::path(store_root()) / "config.json").string(), text);
        label(298, 374, "Architecture", muted); label(298, 402, "C++23 desktop manager  +  JavaScript MCP bridge", text);
        label(298, 456, "Portability", muted); label(298, 484, "Copy the store folder to move memories between machines and AIs.", text);
        button(298, 530, 170, "Open config file");
    }
    void mcp() {
        label(286, 120, "MCP Bridge", text); label(286, 145, "Connect any MCP-capable AI to the shared store", accent); line_at(286, 166, static_cast<int>(width_) - 28);
        fill(298, 194, 14, 14, accent); label(326, 207, "JavaScript service is separate from this C++23 GUI", text);
        label(298, 260, "Endpoint", muted); label(298, 288, "http://localhost:3099/mcp", text);
        label(298, 340, "Capabilities", muted); label(298, 368, "Save, search, list, inspect, update, delete, link, context, files", text);
        fill(298, 418, 190, 42, accent); label(322, 445, "Start MCP service", 0x11141b);
        label(298, 510, "The C++ GUI never depends on localhost. MCP is only for external AI clients.", muted);
    }
    void prompt() {
        label(286, 120, "AI Prompt", text); label(286, 145, "Shared rules for every connected AI", accent); line_at(286, 166, static_cast<int>(width_) - 28);
        const auto rows = lines_for(read_file("SYSTEM_PROMPT.md"), 105);
        int y = 198;
        for (const auto& row : rows) { label(298, y, row, text); y += 22; if (y > static_cast<int>(height_) - 75) break; }
    }
    void create_modal() {
        fill(210, 105, width_ - 420, height_ - 190, 0x202631);
        color(accent); XDrawRectangle(display_, window_, gc_, 210, 105, width_ - 420, height_ - 190);
        label(244, 145, "NEW MEMORY", text); label(244, 169, "Broad topic  •  Findable tags  •  Precise content", muted);
        const char* names[] = {"Precise title", "Broad topic", "Findable tags", "Content"};
        std::string* values[] = {&form_title_, &form_topics_, &form_tags_, &form_body_};
        for (int index = 0; index < 4; ++index) {
            const int y = 220 + index * 72;
            label(244, y, names[index], index == form_field_ ? accent : muted);
            fill(244, y + 12, width_ - 488, index == 3 ? 62 : 34, index == form_field_ ? 0x2b3341 : 0x181d25);
            label(258, y + 35, *values[index], text);
        }
        button(244, static_cast<int>(height_) - 116, 142, edit_mode_ ? "Save changes" : "Save memory", true);
        button(398, static_cast<int>(height_) - 116, 110, "Cancel");
        label(526, height_ - 92, "Tab / Enter next field  •  Ctrl+Enter save", muted);
    }
    void delete_modal() {
        fill(360, 255, width_ - 720, 190, 0x202631);
        color(0xc95252); XDrawRectangle(display_, window_, gc_, 360, 255, width_ - 720, 190);
        label(394, 300, "Delete this memory?", text);
        label(394, 330, "This removes the local markdown file. This cannot be undone.", muted);
        button(394, 365, 128, "Delete", true);
        button(536, 365, 104, "Cancel");
    }
    void draw() {
        fill(0, 0, width_, height_, bg); topbar(); sidebar();
        if (section_ == 0) memory_list(); else if (section_ == 1) files(); else if (section_ == 2) settings(); else if (section_ == 3) mcp(); else prompt();
        fill(0, height_ - 1, width_, 1, accent);
        if (create_mode_) create_modal();
        if (delete_mode_) delete_modal();
        XFlush(display_);
    }
    void select_section(int section) { section_ = section; detail_ = false; search_mode_ = false; scroll_ = 0; status_ = "Viewing " + std::string(section == 0 ? "memories" : section == 1 ? "files" : section == 2 ? "settings" : section == 3 ? "MCP" : "AI prompt"); }
    void start_mcp() {
        const std::string log = (fs::path(store_root()) / "mcp.log").string();
        const std::string command = "nohup bun run src/mcp-server.ts >>\"" + log + "\" 2>&1 &";
        status_ = std::system(command.c_str()) == 0 ? "MCP service started in the background" : "Could not start MCP service";
    }
    void open_config() {
        const fs::path config = fs::path(store_root()) / "config.json";
        auto found = std::find_if(files_.begin(), files_.end(), [&](const StoreFile& file) { return file.path == config; });
        if (found == files_.end()) { status_ = "No config.json yet — it is created when settings are saved by the CLI"; return; }
        file_selected_ = static_cast<int>(std::distance(files_.begin(), found));
        section_ = 1; file_detail_ = true; detail_scroll_ = 0; status_ = "Opened configuration file";
    }
    void begin_edit() {
        if (filtered_.empty()) return;
        create_mode_ = true; edit_mode_ = true; form_field_ = 0;
        form_title_ = filtered_[selected_].title;
        form_topics_ = filtered_[selected_].topics;
        form_tags_ = filtered_[selected_].tags;
        form_body_ = filtered_[selected_].body;
    }
    void begin_create() {
        create_mode_ = true; edit_mode_ = false; form_field_ = 0;
        form_title_.clear(); form_topics_.clear(); form_tags_.clear(); form_body_.clear();
    }
    void delete_selected() {
        if (filtered_.empty()) return;
        std::error_code error;
        fs::remove(filtered_[selected_].path, error);
        delete_mode_ = false;
        if (error) { status_ = "Could not delete memory: " + error.message(); return; }
        selected_ = 0; detail_ = false; reload(); status_ = "Memory deleted";
    }
    void save_form() {
        if (form_title_.empty() || form_body_.empty()) { status_ = "Title and content are required"; return; }
        fs::create_directories(fs::path(store_root()) / "inbox");
        const auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
        const auto path = edit_mode_ && !filtered_.empty()
            ? filtered_[selected_].path
            : fs::path(store_root()) / "inbox" / (std::to_string(now) + "-memory.md");
        std::ofstream out(path);
        out << "---\ntitle: " << form_title_ << "\ntopics: [" << form_topics_ << "]\ntags: [" << form_tags_ << "]\nupdatedAt: " << now << "\n---\n" << form_body_ << "\n";
        const bool edited = edit_mode_;
        create_mode_ = false; edit_mode_ = false; form_title_.clear(); form_topics_.clear(); form_tags_.clear(); form_body_.clear(); reload(); status_ = edited ? "Memory updated" : "Memory saved";
    }
public:
    int run() {
        display_ = XOpenDisplay(nullptr); if (!display_) return 1;
        screen_ = DefaultScreen(display_);
        window_ = XCreateSimpleWindow(display_, RootWindow(display_, screen_), 80, 80, width_, height_, 0, 0, bg);
        XStoreName(display_, window_, "sonderr-memory - DXN1-0DAY");
        XSelectInput(display_, window_, ExposureMask | ButtonPressMask | KeyPressMask | StructureNotifyMask);
        XMapWindow(display_, window_); gc_ = XCreateGC(display_, window_, 0, nullptr); reload();
        for (;;) {
            XEvent event; XNextEvent(display_, &event);
            if (event.type == DestroyNotify) break;
            if (event.type == ConfigureNotify) { width_ = event.xconfigure.width; height_ = event.xconfigure.height; }
            if (event.type == ButtonPress) {
                const int x = event.xbutton.x, y = event.xbutton.y;
                if (event.xbutton.button == Button4 || event.xbutton.button == Button5) {
                    const int delta = event.xbutton.button == Button4 ? -1 : 1;
                    if ((detail_ || file_detail_)) detail_scroll_ = std::max(0, detail_scroll_ + delta * 3);
                    else if (section_ == 0) scroll_ = std::max(0, scroll_ + delta);
                    else if (section_ == 1) file_scroll_ = std::max(0, file_scroll_ + delta);
                } else if (delete_mode_) {
                    if (x >= 394 && x <= 522 && y >= 365 && y <= 403) delete_selected();
                    else if (x >= 536 && x <= 640 && y >= 365 && y <= 403) delete_mode_ = false;
                } else if (create_mode_) {
                    if (x >= 244 && x <= 386 && y >= static_cast<int>(height_) - 116 && y <= static_cast<int>(height_) - 78) save_form();
                    else if (x >= 398 && x <= 508 && y >= static_cast<int>(height_) - 116 && y <= static_cast<int>(height_) - 78) { create_mode_ = false; edit_mode_ = false; }
                    else if (x > 220 && y > 210 && y < 540) form_field_ = std::clamp((y - 220) / 72, 0, 3);
                }
                else if (x < sidebar_width && y >= 113 && y < 400) select_section(std::clamp((y - 113) / 54, 0, 4));
                else if (section_ == 0 && detail_ && x >= static_cast<int>(width_) - 240 && x <= static_cast<int>(width_) - 148 && y >= 184 && y <= 222) begin_edit();
                else if (section_ == 0 && detail_ && x >= static_cast<int>(width_) - 136 && x <= static_cast<int>(width_) - 28 && y >= 184 && y <= 222) delete_mode_ = true;
                else if (section_ == 0 && x > 270 && y > 170 && !filtered_.empty()) { selected_ = std::clamp((y - 170) / 70 + scroll_, 0, static_cast<int>(filtered_.size()) - 1); detail_ = true; detail_scroll_ = 0; }
                else if (section_ == 1 && file_detail_ && x >= static_cast<int>(width_) - 140 && x <= static_cast<int>(width_) - 28 && y >= 184 && y <= 222) { file_detail_ = false; detail_scroll_ = 0; }
                else if (section_ == 1 && x > 270 && y > 170 && !files_.empty()) { file_selected_ = std::clamp((y - 174) / 38 + file_scroll_, 0, static_cast<int>(files_.size()) - 1); file_detail_ = true; detail_scroll_ = 0; }
                else if (section_ == 2 && x >= 298 && x <= 468 && y >= 530 && y <= 568) open_config();
                else if (section_ == 3 && x >= 298 && x <= 488 && y >= 418 && y <= 460) start_mcp();
                else if (x > static_cast<int>(width_) - 90 && y < 70) { begin_create(); search_mode_ = false; }
                else if (x > static_cast<int>(width_) - 400 && y < 70) { search_mode_ = true; }
            }
            if (event.type == KeyPress) {
                KeySym key; char buffer[32]{}; const int length = XLookupString(&event.xkey, buffer, sizeof(buffer), &key, nullptr);
                const bool ctrl = (event.xkey.state & ControlMask) != 0;
                if (key == XK_Escape) { if (delete_mode_) delete_mode_ = false; else if (create_mode_) { create_mode_ = false; edit_mode_ = false; } else if (file_detail_) file_detail_ = false; else if (detail_) detail_ = false; else if (search_mode_) search_mode_ = false; else break; }
                else if (key == XK_q && !search_mode_ && !create_mode_) break;
                else if (key == XK_r && !create_mode_) reload();
                else if (key == XK_n && !search_mode_ && !create_mode_) begin_create();
                else if (key == XK_e && detail_ && !create_mode_) begin_edit();
                else if ((key == XK_Delete || key == XK_x) && detail_ && !create_mode_) delete_mode_ = true;
                else if (key == XK_slash && !create_mode_) { search_mode_ = true; search_.clear(); }
                else if (key == XK_Tab && !create_mode_) select_section((section_ + 1) % 5);
                else if (key == XK_Return && section_ == 0 && !filtered_.empty() && !create_mode_ && !search_mode_) { detail_ = true; detail_scroll_ = 0; }
                else if (key == XK_Return && section_ == 1 && !files_.empty() && !create_mode_ && !search_mode_) { file_detail_ = true; detail_scroll_ = 0; }
                else if (key == XK_Up && section_ == 0) { selected_ = std::max(0, selected_ - 1); if (selected_ < scroll_) --scroll_; }
                else if (key == XK_Down && section_ == 0) { selected_ = std::min(static_cast<int>(filtered_.size()) - 1, selected_ + 1); if (selected_ > scroll_ + 7) ++scroll_; }
                else if (key == XK_Up && section_ == 1) { file_selected_ = std::max(0, file_selected_ - 1); if (file_selected_ < file_scroll_) --file_scroll_; }
                else if (key == XK_Down && section_ == 1) { file_selected_ = std::min(static_cast<int>(files_.size()) - 1, file_selected_ + 1); if (file_selected_ > file_scroll_ + 10) ++file_scroll_; }
                else if (key == XK_Return && create_mode_) { if (ctrl) save_form(); else form_field_ = std::min(3, form_field_ + 1); }
                else if (search_mode_ && (key == XK_BackSpace || key == XK_Delete)) { if (!search_.empty()) search_.pop_back(); refresh_filter(); }
                else if (search_mode_ && length > 0 && buffer[0] >= 32) { search_.append(buffer, length); refresh_filter(); }
                else if (create_mode_ && (key == XK_BackSpace || key == XK_Delete)) { std::string* fields[] = {&form_title_, &form_topics_, &form_tags_, &form_body_}; if (!fields[form_field_]->empty()) fields[form_field_]->pop_back(); }
                else if (create_mode_ && length > 0 && buffer[0] >= 32) { std::string* fields[] = {&form_title_, &form_topics_, &form_tags_, &form_body_}; fields[form_field_]->append(buffer, length); }
            }
            draw();
        }
        XFreeGC(display_, gc_); XDestroyWindow(display_, window_); XCloseDisplay(display_); return 0;
    }
};

int main() { return Gui{}.run(); }
