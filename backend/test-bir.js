const Bir = require('bir1').default;

async function test() {
  try {
    const bir = new Bir({ key: 'abcde12345abcde12345' });
    await bir.login();
    const result = await bir.search({ nip: '5261040567' }); // Example NIP
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}

test();
