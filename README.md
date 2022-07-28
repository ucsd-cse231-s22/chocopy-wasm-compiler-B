# ChocoPy (Typed Python) WebAssembly Compiler
## Class Project for CSE 231: Advanced Compiler Design, UCSD Spring 2022

### To Deploy : 
1. Download the source code from the "jeff2" branch
2. In your terminal/shell, navigate to the directory "chocopy-wasm-compiler-B".
3. Run the unix command "npm install" to install necessary packages. 
4. Run the unix command "npm run build-web" to create a "build" directory with a webstart.js and index.html file. 
5. Next run "make". This will create two .wasm files in the build directory.  
6. For the next step, make sure you have Python installed on your machine to run python httpserver. It can be found here: https://www.python.org/downloads/
7. Move into the build directory by running "cd build". 
8. In the build directory, run "python -m http.server"
9. Now move over to your browser. Type the url "localhost:8000" which should deploy the compiler directly.

Or, follow this link: 
https://ucsd-cse231-s22.github.io/chocopy-wasm-compiler-B/

The compiler at this link contains most of the features, however integers larger than 32 bits are not supported in this version. (This is what our group worked on).

### Description: 
The primary goal of this project was to create a compiler that could translate typed Python3 code ([ChocoPy](https://chocopy.org/)) into [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) in the browser.
For language specification, refer to the ChocoPy documentation [here](https://chocopy.org/). Base ChocoPy language will run on this application, however other groups added additional Python features such as lists, sets, for loops, comprehensions, big numbers, etc. The "Designs" folder includes information on different groups additions. 
### Our work: 
Our group's contribution to the project was to provide support for the use of arbitrarily large numbers. WebAssembly's default number types support 32 and 64 bit integers and floats, however beyond this was up to our own implementation.
We included support for arithmetic and logical operations for large numbers, as well as support for python integer builtin functions, such as max(), min(), abs(), etc. In the end stages of this project, we worked with other teams so they could include big numbers in their features, such as lists and sets. 

For more information on the design/function of the compiler and the way I would expand the compiler to include support for arbitrarily large floating point numbers, you can read my final project paper here: [Float Support for ChocoPy WASM compiler (PDF)](https://github.com/jmakings/chocopy-wasm-compiler-B/files/9161957/Float.Support.for.ChocoPy.WASM.compiler.pdf)
