# [Tawian Emulator](https://somnonetz.github.io/tawian-emulator/)

Run Linux programs in the browser. Based on [copy/v86](https://github.com/copy/v86).


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
