import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import VideoCall from './components/VideoCall'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>

      <div>
        <VideoCall />
      </div>
    </>
  )
}

export default App
