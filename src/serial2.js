window.emulator = null;

window.onload = () => {

   emulator = new V86Starter({
      // Uncomment to see what's going on
      //screen_container: document.getElementById("screen_container"),

      bios: {
         url: "seabios.bin",
      },
      vga_bios: {
         url: "vgabios.bin",
      },
      cdrom: {
         url: "linux.iso", // Arch ?
      },
      autostart: true,
      disable_keyboard: true,
      disable_mouse: true,
   });

   window.execute = execute;
   const TOKEN = 'f817193d5f683b5210cff5d804aa488b';
   const noop = () => {};

   let currentReceiver = init();
   emulator.add_listener('serial0-output-char', (char) => {
      document.getElementById('terminal').value += char; // REMOVE
      currentReceiver(char);
   });

   // TODO: change to 'on ready' or remove
   function done() {
      execute('ls').then(result => console.log('result 1', result))
         .then(() => execute('echo hallo').then(result => console.log('result 2', result)))
         .then(() => execute('ls -al').then(result => console.log('result 3', result)));
   }

   function init() {
      const stages = [
         { pattern: 'login:',        command: 'root\n' },
         { pattern: '/root% ',       command: `export PS1='\\n${TOKEN}'\n` },
         { pattern: `'\\n${TOKEN}'`, command: '' },
         { pattern: TOKEN,           command: 'DONE' },
      ];
      let currentStage = stages.shift();
      let output = '';

      return function(char) {
         output += char;

         if (output.endsWith(currentStage.pattern)) {
            if (currentStage.command === 'DONE') {
               currentReceiver = noop;
               done(); // REMOVE
               // TODO: emit 'ready' event
            }
            else {
               emulator.serial0_send(currentStage.command);

               currentStage = stages.shift();
               output = '';
            }
         }
      }
   };

   function execute(command, delimiter = TOKEN) {
      return new Promise((resolve, reject) => {

         let currentLine = '';
         const data = { result: '' };

         currentReceiver = listener;
         emulator.serial0_send(`${command}\n`);

         function listener(char) {
            if (char === '\n') {
               if (!data.command) {
                  data.command = currentLine;
               }
               else {
                  data.result += currentLine;
               }
               currentLine = '';
            }
            else {
               currentLine += char;

               if (currentLine === delimiter) {
                  currentReceiver = noop;
                  // data.cleanedResult = clean(data.result); // TODO
                  resolve(data);
               }
            }
         }
      });
   }

};

// Event emitter
/*
function mitt(all = {}) {

   function list(type) {
      const t = type.toLowerCase();
      return all[t] || (all[t] = []);
   }

   return {
      on(type, handler) {
         list(type).push(handler);
         return () => this.off(type, handler);
      },

      once(type, handler) {
         const newHandler = (...args) => {
            handler(...args);
            this.off(type, newHandler);
         };
         return this.on(type, newHandler);
      },

      off(type, handler) {
         const e = list(type);
         const i = e.indexOf(handler);
         if (~i) e.splice(i, 1);
      },

      emit(type, event) {
         list('*').concat(list(type)).forEach(f => f(event, type));
      }
   };

}
*/
