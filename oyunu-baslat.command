#!/bin/bash
# Mac'te çift tıklayınca oyunu yerel sunucuda açar.
cd "$(dirname "$0")"
PORT=8000
open "http://localhost:$PORT/index.html"
python3 -m http.server $PORT
