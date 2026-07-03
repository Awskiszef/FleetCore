const nip = '5261040567';
const key = 'abcde12345abcde12345';
const url = 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';

async function test() {
  const loginBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${url}</wsa:To>
<wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj</wsa:Action>
</soap:Header>
<soap:Body>
<ns:Zaloguj>
<ns:pKluczUzytkownika>${key}</ns:pKluczUzytkownika>
</ns:Zaloguj>
</soap:Body>
</soap:Envelope>`;

  const loginRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
    body: loginBody
  });
  const loginText = await loginRes.text();
  const sidMatch = loginText.match(/<ZalogujResult>(.*?)<\/ZalogujResult>/);
  if (!sidMatch) return console.log("Login failed");
  const sid = sidMatch[1];
  console.log("SID:", sid);

  const searchBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07" xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${url}</wsa:To>
<wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty</wsa:Action>
</soap:Header>
<soap:Body>
<ns:DaneSzukajPodmioty>
<ns:pParametryWyszukiwania>
<dat:Nip>${nip}</dat:Nip>
</ns:pParametryWyszukiwania>
</ns:DaneSzukajPodmioty>
</soap:Body>
</soap:Envelope>`;

  const searchRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8', 'sid': sid },
    body: searchBody
  });
  const searchText = await searchRes.text();
  console.log(searchText);
}

test();
