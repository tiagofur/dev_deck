import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export function createRoom(roomID: string, serverURL: string = 'ws://localhost:8080/api/realtime') {
  const doc = new Y.Doc()
  const provider = new WebsocketProvider(serverURL, roomID, doc)
  
  return {
    doc,
    provider,
    getText: (name: string) => doc.getText(name),
    getArray: (name: string) => doc.getArray(name),
    getMap: (name: string) => doc.getMap(name),
    destroy: () => {
      provider.destroy()
      doc.destroy()
    }
  }
}

export { Y, WebsocketProvider }
