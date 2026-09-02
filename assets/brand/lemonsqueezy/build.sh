#!/bin/zsh
# Renders the Lemon Squeezy store/product images from the HTML templates in
# this folder with headless Chrome. Output PNGs land next to the templates.
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

render() { # file.html WxH out.png
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$2" --screenshot="$3" "file://$PWD/$1" >/dev/null 2>&1
  echo "$3  $(sips -g pixelWidth -g pixelHeight "$3" | awk '/pixel/ {printf "%s ", $2}')"
}

render product-hero.html    1600,1200 tembro-credits-product.png
render pack-starter.html    1600,1200 tembro-credits-starter.png
render pack-studio.html     1600,1200 tembro-credits-studio.png
render store-cover.html     1600,900  tembro-store-cover.png
cp ../tembro-icon.png tembro-store-logo-1024.png
sips -z 512 512 ../tembro-icon.png --out tembro-store-favicon-512.png >/dev/null
echo "tembro-store-logo-1024.png  1024 1024"
echo "tembro-store-favicon-512.png  512 512"
