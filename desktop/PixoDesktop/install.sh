#!/bin/zsh
set -euo pipefail

script_dir="${0:A:h}"
source_app="$($script_dir/build.sh)"
install_root="$HOME/Applications"
installed_app="$install_root/Pixo Desktop.app"
agent_dir="$HOME/Library/LaunchAgents"
agent_file="$agent_dir/com.pixoworld.desktop.plist"

mkdir -p "$install_root" "$agent_dir"
ditto "$source_app" "$installed_app"
cp -X "$script_dir/com.pixoworld.desktop.plist" "$agent_file"

launchctl bootout "gui/$UID" "$agent_file" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$agent_file"
open "$installed_app"

echo "Pixo Desktop is installed and will start automatically at login."
