import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export function createRoom(roomID: string, serverURL: string = 'ws://localhost:8080/api/realtime', token?: string | null) {
  const doc = new Y.Doc()
  // y-websocket appends the room to the URL path; opts.params become query
  // params on that final URL — the transport the backend authenticates with.
  const provider = new WebsocketProvider(
    serverURL,
    roomID,
    doc,
    token ? { params: { token } } : undefined,
  )

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
