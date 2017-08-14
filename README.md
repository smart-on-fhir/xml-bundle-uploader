# xml-bundle-uploader


This is a simple CLI tool to upload xml fhir bundles.

## Installation:
```sh
cd my/directory/somewhere
git clone https://github.com/smart-on-fhir/xml-bundle-uploader.git
cd xml-bundle-uploader
npm i
```

## Usage:
```sh
# cd into the project directory and run:
node . -d ../my/generated/sample/data -s http://my.target.server
# or:
node . -d ../my/generated/sample/data -s http://my.target.server -p http://my.proxy/url
```