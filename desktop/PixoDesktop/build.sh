#!/bin/zsh
set -euo pipefail

script_dir="${0:A:h}"
project_dir="${script_dir:h:h}"
build_dir="$script_dir/build"
app_dir="$build_dir/Pixo Desktop.app"

mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources"
xcrun swiftc -swift-version 5 "$script_dir/PixoDesktop.swift" -o "$app_dir/Contents/MacOS/PixoDesktop" -framework Cocoa
cp -X "$script_dir/Info.plist" "$app_dir/Contents/Info.plist"
cp -X "$project_dir/assets/pixo_2d.png" "$app_dir/Contents/Resources/pixo_2d.png"
chmod +x "$app_dir/Contents/MacOS/PixoDesktop"

echo "$app_dir"
