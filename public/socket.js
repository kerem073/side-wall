export function socketInit(){
    
    let socket = new WebSocket("ws://localhost:3000/point");

    socket.addEventListener("open", (event) => {
        // socket.send("Connected");
    });

    socket.addEventListener("message", (event) => {
        // console.log("message from server: " + event.data);
    });

    socket.addEventListener("error", (event) => {
      console.log("WebSocket error: ", event);
    });

    return socket
}
