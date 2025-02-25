import {Plugin} from "vite"

export default function consolePipe() : Plugin {
    return {
        name: "console-pipe",
        configureServer(server) {
            setInterval(() => {
                console.log("9")
                server.ws.send("console-pipe:ds", {type: "custom", data: "Hello from server!"})
            }, 1000)
        },
        
    }

}