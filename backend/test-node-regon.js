const Regon = require('node-regon');

async function test() {
  try {
    const regon = new Regon(); // It uses the test key by default if none provided or maybe test env?
    const result = await regon.findByNip('5261040567');
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}

test();
