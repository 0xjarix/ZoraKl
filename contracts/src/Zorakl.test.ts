import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, Signature } from 'o1js';
import { Zorakl } from './Zorakl';
//import { PriceData } from './Zorakl';

/*
 * This file specifies how to test the `Zorakl` example smart contract.
 */


let proofsEnabled = false;
// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
  'B62qpDUv13RzSnUdkesu9m78YGysb6KUuCCAdfxs8NX3oksm6rrBF1d';

describe('Zorakl', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Zorakl;

  beforeAll(async () => {
    if (proofsEnabled) await Zorakl.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Zorakl(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `OracleExample` smart contract', async () => {
    await localDeploy();
    const oraclePublicKey = zkApp.oraclePublicKey.get();
    expect(oraclePublicKey).toEqual(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
  });

  describe('hardcoded values', () => {
    it('emits a `time` and `price` events containing the pricefeed time and price if the provider is valid source', async () => {
      await localDeploy();

      const price = Field(53008900);
      const time = Field(1728406858);
      //const priceData = new PriceData({ price, time });
      const signature = Signature.fromBase58(
        '7mXJAj3ewMN6ziouSigZ5x8QECUSb6u54Qgk4pdx65nUTm95t2h8mkthAvoEzA6E1j2V2PAiPQwEnfNonKPHJPrHpX8sZTVf'
      );

      const txn = await Mina.transaction(senderAccount, async () => {
        await zkApp.verify(time, price, signature);
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      const events = await zkApp.fetchEvents();
      const verifiedEventValuePrice = events[1].event.data.toFields(null)[0];
      expect(verifiedEventValuePrice).toEqual(price);
      const verifiedEventValueTime = events[0].event.data.toFields(null)[0];
      expect(verifiedEventValueTime).toEqual(time);
    });
  });

  describe('actual API requests', () => {
    const API_URL = 'https://zora-kl.vercel.app/api/asset-price';

    it('throws an error if the credit score is below 700 even if the provided signature is valid', async () => {
      await localDeploy();

      const response = await fetch(API_URL);
      const data = await response.json();
      let { price, time} = data.data;
      let signature = data.signature;

      time = Field(time);
      price = Field(price);
      signature = Signature.fromBase58(signature);

      expect(async () => {
        const txn = await Mina.transaction(senderAccount, async () => {
          await zkApp.getPriceData();
        });
      }).rejects;
    });
  });
});
