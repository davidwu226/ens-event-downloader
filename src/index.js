import Promise from 'bluebird'
import Web3 from 'web3'
import fs from 'fs'
import moment from 'moment'
import 'moment-duration-format'
import readline from 'readline'
import artifact from './abi/Registrar.json'

const PROVIDER_URL = 'https://mainnet.infura.io'
const MAX_RETRIES = 30
const INITIAL_DELAY = 100
const MAX_DELAY = 30 * 1000
const BATCH_SIZE = 25000
const START = 6500000//3625000

const status = {
  startTime: new Date(),
  duration: 0,
  startBlock: START,
  endBlock: undefined,
  fromBlock: 0,
  blocksProcessed: 0,
  batchSize: BATCH_SIZE,
  reduceBatchSize: 0,
  eventsFound: 0,
  currentBlock: 0,
  rate: 0,
  events : {},
}

let web3

async function refreshWeb3() {
  for (let i = 0; i < MAX_RETRIES; ++i) {
    try {
      if (web3 && web3.eth.net.isListening()) {
        return web3
      }
      
      web3 = new Web3(PROVIDER_URL)
      
    } catch (err) {
      // IGNORE.
    }

    await Promise.delay(Math.min(INITIAL_DELAY * (2**i), MAX_DELAY))
  }
}

async function updateStatus() {
  const duration = (new Date()).getTime() - status.startTime.getTime()
  status.duration = moment.duration(duration, 'ms').format('h[hrs]:m[m]:s[s.]S')
  status.currentBlock = await web3.eth.getBlockNumber()
  status.blocksProcessed = status.fromBlock - status.startBlock
  status.blocksPerSecond = status.blocksProcessed / (duration / 1000)
}

async function start() {
  await refreshWeb3()
  const registry = await web3.eth.ens.checkNetwork()
  const registrar = await web3.eth.ens.registry.owner('eth')
  const Registrar = new web3.eth.Contract(artifact.abi, registrar)
  for (status.fromBlock = status.startBlock; status.fromBlock < (status.endBlock || await web3.eth.getBlockNumber()); status.fromBlock += status.batchSize) {
    while (true) {
      try {
        const s = new Date()
        const fromBlock = status.fromBlock
        const toBlock = status.fromBlock + status.batchSize - 1
        const events = await Registrar.getPastEvents('allEvents', { fromBlock, toBlock })
        const e = new Date()
        const d = e.getTime() - s.getTime()
        status.lastDuration = moment.duration(d, 'ms').format('h[hrs]:m[m]:s[s.]S')
        status.lastBlocksPerSecond = status.batchSize / (d / 1000)
        status.eventsFound += events.length
        events.forEach(e => {
          status.events[e.event] = (status.events[e.event] || 0) + 1
        })
        fs.writeFileSync(`ens-events-${fromBlock}-${toBlock}`, JSON.stringify(events, null, 2))
        break
      } catch (err) {
        console.log(err)
        status.batchSize = status.batchSize / 2
        status.reduceBatchSize++
        console.log(`Reducing batch size to ${status.batchSize}.`)
      }
    }
  }
  status.completed = true
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', async (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  } else {
    await updateStatus()
    console.log(JSON.stringify(status, null, 2))
  }
});

start()