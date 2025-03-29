Install Node / NPM
```
npm install express ws
npm init -y
npm install --save-dev electron
npm start
```
UNICAST:
```
> Deploy Vivoh WtMPEG: https://github.com/erikherz/wtmpeg
> Confirm or change the URL and click Connect
```
Multicast:
```
> Deownload source file: https://wtmpeg.com/adena.mp4
> Install FFmpeg
> Run: ffmpeg -re -stream_loop -1 -i adena.mp4 -c copy -f mpegts udp://127.0.0.1:8888?pkt_size=1316
> Select "Multicast"
> Confirm or change the Group Address : Port and click Connect
```
