CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -Wpedantic

ifeq ($(OS),Windows_NT)
BIN := minicomp.exe
else
BIN := minicomp
endif

.PHONY: all test regenerate
all: $(BIN)

$(BIN): src/main.cpp src/interpreter.inc src/grammar.generated.hpp src/lexer.generated.hpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) src/main.cpp $(LDFLAGS) -o $@

test: $(BIN)
	node tests/run.mjs

regenerate:
	node tools/generate-grammar.mjs
	node tools/generate-lexer.mjs
