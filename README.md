Install Node / NPM
```
npm install express ws
npm init -y
npm install --save-dev electron
npm start
```

Multicast Playback:
```
> Install FFmpeg
> Run: ffmpeg -re -stream_loop -1 -i video.mp4 -c copy -f mpegts "udp://239.0.0.1:8888?pkt_size=1316"
> open out/multicast-webtransport-player-darwin-arm64/multicast-webtransport-player.app --args globalUrl=fec://239.0.0.1:8888
```

Buiilding a binary:
```
npm install --save-dev @electron-forge/cli
npx electron-forge import
npm run make
```
This will be in ./out


<img width="994" alt="Vivoh_Five" src="https://github.com/user-attachments/assets/8b9a0550-4eef-4e76-a46b-239c0fe31ba4" />
