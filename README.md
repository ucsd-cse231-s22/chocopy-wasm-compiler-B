# ChocoPy (Typed Python) WebAssembly Compiler
## Class Project for CSE 231: Advanced Compiler Design, UCSD Spring 2022

### To Deploy : 
1. Download the source code from the "jeff2" branch
2. In your terminal/shell, navigate to the directory "chocopy-wasm-compiler-B".
3. Run the unix command "npm run build-web" to create a "build" directory with a webstart.js and index.html file. 
4. Next run "make". This will create two .wasm files in the build directory.  
5. For the next step, make sure you have Python installed on your machine to run python httpserver. It can be found here: https://www.python.org/downloads/
6. Move into the build directory by running "cd build". 
7. In the build directory, run "python -m http.server"
8. Now move over to your browser. Type the url "localhost:8000" which should deploy the compiler directly.  


Or, follow this link: 
https://ucsd-cse231-s22.github.io/chocopy-wasm-compiler-B/

The compiler at this link contains most of the features, however integers larger than 32 bits are not supported in this version. (This is what our group worked on). 
