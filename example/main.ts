document.getElementById('root')!.innerHTML =
    '<p>Welcome to the minimal Vite project!</p>';

const test = () => {
    console.log('Hello, Vite!');
};

console.log('ddd');
// const a = () => {
//     const b = () => {
//         throw new Error('Test error from client');
//     };
//     b();
// };
setInterval(async () => {
    // a();


    
    await new Promise((_, reject) =>
        reject(new Error('Test unhandled rejection'))
    );
}, 4000);

// test();
