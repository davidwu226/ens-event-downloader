import Promise from 'bluebird'
import Web3 from 'web3'
import fs from 'fs'
import moment from 'moment'
import 'moment-duration-format'
import commander from 'commander'
import readline from 'readline'
import artifact from './abi/Registrar.json'

const PROVIDER_URL = 'https://mainnet.infura.io'
const MAX_RETRIES = 30
const INITIAL_DELAY = 100
const MAX_DELAY = 30 * 1000
const BATCH_SIZE = 25000

async function refreshWeb3(web3) {
  for (let i = 0; i < MAX_RETRIES; ++i) {
    try {
      if (web3 && web3.eth.net.isListening()) {
        return web3
      }

      web3 = new Web3(PROVIDER_URL)

    } catch (err) {
      // IGNORE.
    }

    await Promise.delay(Math.min(INITIAL_DELAY * (2 ** i), MAX_DELAY))
  }
}

class Downloader {

  constructor(id, start, end, path) {
    this.status = {
      id,
      startTime: new Date(),
      duration: 0,
      startBlock: start,
      endBlock: end,
      fromBlock: 0,
      blocksProcessed: 0,
      batchSize: BATCH_SIZE,
      reduceBatchSize: 0,
      eventsFound: 0,
      currentBlock: 0,
      rate: 0,
      events: {},
    }

    this.path = path
  }

  async updateStatus() {
    const duration = (new Date()).getTime() - this.status.startTime.getTime()
    this.status.duration = moment.duration(duration, 'ms').format('h[hrs]:m[m]:s[s.]S')
    this.status.currentBlock = await this.web3.eth.getBlockNumber()
    this.status.blocksProcessed = this.status.fromBlock - this.status.startBlock
    this.status.blocksPerSecond = this.status.blocksProcessed / (duration / 1000)
  }

  async start() {
    this.web3 = await refreshWeb3(this.web3)
    
    const registry = await this.web3.eth.ens.checkNetwork()
    const registrar = await this.web3.eth.ens.registry.owner('eth')
    const Registrar = new this.web3.eth.Contract(artifact.abi, registrar)
    
    for (this.status.fromBlock = this.status.startBlock; this.status.fromBlock < (this.status.endBlock || await this.web3.eth.getBlockNumber()); this.status.fromBlock += this.status.batchSize) {
      while (true) {
        try {
          const s = new Date()
          const fromBlock = this.status.fromBlock
          const toBlock = this.status.fromBlock + this.status.batchSize - 1
          const events = await Registrar.getPastEvents('allEvents', { fromBlock, toBlock })
          const e = new Date()
          const d = e.getTime() - s.getTime()
          this.status.lastDuration = moment.duration(d, 'ms').format('h[hrs]:m[m]:s[s.]S')
          this.status.lastBlocksPerSecond = this.status.batchSize / (d / 1000)
          this.status.eventsFound += events.length
          events.forEach(e => {
            this.status.events[e.event] = (this.status.events[e.event] || 0) + 1
          })
          fs.writeFileSync(`${this.path}${fromBlock}-${toBlock}`, JSON.stringify(events, null, 2))
          break
        } catch (err) {
          console.log(err)
          this.status.batchSize = this.status.batchSize / 2
          this.status.reduceBatchSize++
          console.log(`Reducing batch size to ${this.status.batchSize}.`)
          this.web3 = await refreshWeb3(this.web3)
        }
      }
    }
    this.status.completed = true
  }
}

const downloaders = []

async function main() {
  commander
  .option('-s --start <n>', 'Start block', parseInt)
  .option('-e --end <n>', 'End block', parseInt)
  .option('-c --concurrency <n>', 'Number of concurrent downloaders', parseInt)
  .parse(process.argv)

  const web3 = await refreshWeb3()
  const start = commander.start === undefined ? 3625000 : commander.start
  const end = commander.end || (await web3.eth.getBlockNumber())
  const concurrency = commander.concurrency || 1
  const path = commander.args[0] || './ens-events-' 

  console.log(`Starting from ${start} to ${end} with concurrency ${concurrency} writing to '${path}'.`)
  const division = Math.ceil((end - start) / concurrency)

  let id = 0
  for (let i = start; i < end; i += division) {
    const downloader = new Downloader(id++, i, i + division - 1, path)
    downloader.start()
    downloaders.push(downloader)
  }
}

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)
process.stdin.on('keypress', async (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  } else {
    await Promise.each(downloaders, async (downloader) => {
      await downloader.updateStatus()
      console.log(JSON.stringify(downloader.status, null, 2))      
    })
  }
})

main()