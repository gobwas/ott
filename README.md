# Message Queue Node.[js](https://www.google.ru/search?q=nodejs)

## Usage

```shell
DEBUG=* node ./src/ott/main.js --listen=a --peers=c,d,e,f --interval=1000 --getErrors=true
```
Quick tour video is [uploaded here](https://vimeo.com/147818950).

## Info

Patterns used in this sample:

+ [Raft protocol](https://raft.github.io/) – leader election.
+ [Gossip protocol](https://en.wikipedia.org/wiki/Gossip_protocol) - consistency and nodes knowledge.
