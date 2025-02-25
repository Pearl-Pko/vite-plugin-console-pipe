console.log('Hello, Vite!');

document.getElementById('root')!.innerHTML =
    '<p>Welcome to the minimal Vite project!</p>';

if (import.meta) {
    console.log("import meta")
    import.meta.hot.on('console-pipe:ds', (data) => {
        console.log("any");
        console.log(data); // hello
    });
}
