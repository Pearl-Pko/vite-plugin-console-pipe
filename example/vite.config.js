import { defineConfig } from 'vite'
import consolePipe from "../src/index"

export default defineConfig({
  plugins: [consolePipe()],

})