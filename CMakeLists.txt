cmake_minimum_required(VERSION 3.20)
project(sonderr_memory_tui LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(sonderr-memory-tui cpp/main.cpp)
target_compile_options(sonderr-memory-tui PRIVATE -Wall -Wextra -Wpedantic)

