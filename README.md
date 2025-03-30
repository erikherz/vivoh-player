Install Node / NPM
```
npm install express ws
npm init -y
npm install --save-dev electron
npm start
```
UNICAST:
```
> Deploy Vivoh WTMPEG: https://github.com/erikherz/wtmpeg (contact erik@vivoh.com for access)
> Confirm or change the URL and click Connect
```
Multicast:
```
> Download source file: https://wtmpeg.com/adena.mp4
> Install FFmpeg
> Run: ffmpeg -re -stream_loop -1 -i adena.mp4 -c copy -f mpegts "udp://239.0.0.1:8888?pkt_size=1316"
> Select "Multicast"
> Confirm or change the Group Address : Port and click Connect
```

Buiilding a binary:
```
npm install --save-dev @electron-forge/cli
npx electron-forge import
npm run make\n
```
This will be in ./out

Binaries:
```
https://wtmpeg.com/vivoh-mwp-intel.zip
https://wtmpeg.com/vivoh-mwp-silicon.zip
```
