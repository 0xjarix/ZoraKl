import { Field, SmartContract, state, State, method,Signature, PublicKey, Struct,  } from 'o1js';

/**
 *
 * The Zorakl contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */

export class PriceData extends Struct({
  price: Field,
  time: Field,
}){}

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
  'B62qpDUv13RzSnUdkesu9m78YGysb6KUuCCAdfxs8NX3oksm6rrBF1d';

export class Zorakl extends SmartContract {  
  // Define zkApp state
  @state(PublicKey) oraclePublicKey = State<PublicKey>();
  //@state(Field) profit = State<Field>();
  //@state(Field) balance = State<Field>();
  @state(PriceData) priceData = State<PriceData>();
  
  // Define zkApp events
  events = {
    verified_price: Field,
    verified_time: Field,
    token_name: Field,
  };

  init() {
    // Initialize zkApp state
    super.init();
    // Set the oracle public key as zkApp on-chain state
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    // Specify that caller should include signature with tx instead of proof
    this.requireSignature();
    // Initialize contract profit state
    //this.profit.set(Field(0));
     // Initialize contract balance state
    //this.balance.set(Field(0));
  }

  @method async verify(time: Field, price: Field, signature: Signature) {
    // Get the oracle public key from the zkApp state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.requireEquals(oraclePublicKey);
    // Evaluate whether the signature is valid for the provided data
    const validSignature = signature.verify(oraclePublicKey, [price, time]);
    // Check that the signature is valid
    validSignature.assertTrue();
    //store the last price and time
    this.priceData.set(new PriceData({price, time}));
    // Emit an event containing the verified price
    this.emitEvent("verified_price", price);
    // Emit an event containing the verified time
    this.emitEvent("verified_time", time);
  }

  /*@method async getPriceData() {
    return this.priceData.get();
  }


  // @method async buy(signedData:SignedDataamount: Field) {
  // //call verifies data
  // //verifies/update balance
  // //verifies/update profit
  // }

  @method async sell(amount: Field) {
    //call verifies data
    
  }*/
}