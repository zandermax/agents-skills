# >>> agents-skills env >>>
set -q MEMORY_DIR; and test -n "$MEMORY_DIR"; or set -gx MEMORY_DIR "$HOME/.memory"
set -q DECISION_SHADOW; and test -n "$DECISION_SHADOW"; or set -gx DECISION_SHADOW 1
# <<< agents-skills env <<<
