# [Tawian Emulator](http://tawian.io/)

Package Linux programs and run them in the browser.


## Build

```sh
# install dependencies
npm install

# generate filesystem
python fs2json.py public/filesystem > public/filesystem.json

# build development version with watcher
npm start

# build production version
npm run build

# deploy production version to github pages
npm run deploy
```
