import notice from './pairing.notice.json'
import { directoryFromServers } from './exchangeClient.ts'
import servers from './servers.fixture.json'

export { notice, servers }

export const serverDirectory = directoryFromServers(servers)
