import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Web3Modal from "web3modal"
import { providers, Contract } from "ethers"
import { useEffect, useState, useRef } from 'react'
import { WHITELIST_CONTRACT_ADDRESS, abi } from "../constants"

export default function Home() {
  //walletConnected to keep keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  //joinedWhitelist keeps track of whether the current metamask address has joined the whitelist or not
  const [joinedWhitelist, setJoinedWhitelist] = useState(false);
  //loading is set to true when you are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false)
  //numberOfWhitelisted tracks the number of addresses whitelisted
  const [numberOfWhitelisted, setNumberOfWhitelisted] = useState(0);
  //create a reference to the Web3 Mordal (used for connecting to Metamask) which which persist as long as the page is open
   const web3modalRef = useRef();

   /**
    * Returns a provider or signer object representing the ethereum RPC or without the
    * signing capabilities of metamask attached
    * 
    * A `Provider is needed to interact with the blockhain - reading balances, reading state, etc.
    * 
    * A `Signer` is a special tryp of provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
    * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
    * request signayures from the user using Signer functions.
    * 
    * @param {*} needSigner - True if you need the signer, default false otherwise
    */
   const getProviderOrSigner = async (needSigner = false) =>{
    //connect to metamask
    //sincee we store `Web3Modal` as a refernce, we need to access the current value to access to the uderlying object
    const provider = await web3modalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    //if user is not connected to the Goreli network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
     if (chainId !== 5) {
      window.alert("Change network to Goerli");
      throw new Error("Change network to Goerli");
     }

     if(needSigner){
      const signer = web3Provider.getSigner();
      return signer;
     }
     return web3Provider;
   };

   /**
    * addAddressToWhitelist: Adds the current connected address to the whitelist
    * 
    */
   const addAddressToWhitelist = async () =>{
   try{
    //we need a Signer her since this is a `write` transaction
    const signer = await getProviderOrSigner(true);
    //Create a new instance of the Contract with a siger, thich allows
    //update methods
    const whitelistContract = new Contract(
      WHITELIST_CONTRACT_ADDRESS, abi, signer
    );
    //call the addAddressToWhitelist from the contract
    const tx = await whitelistContract.addAddressToWhitelist();
    setLoading(true);
    //wait for the transaction to get mined
    await tx.wait();
    setLoading(false);
    //get the updated number of addresses in the whitelist
    await getNumberOfWhitelisted();
    setJoinedWhitelist(true);
   }
   catch(err){
    console.error(err);
   }
  };
  /**
   * getNumberOfWhitelisted: gets the number of whitelisted addresses
   * 
   */
  const getNumberOfWhitelisted = async () =>{
    try{
      //Get the provider from web3Modal, which in our case is Metamask
      //No need for the Signer here, as we are only reading state from the blockchain
     const provider = await getProviderOrSigner();
     //We connect to the Contract using a Provider, so we will only
     // have read access to the Contract
     const whitelistContract = new Contract(
      WHITELIST_CONTRACT_ADDRESS, abi, provider
     );
     //Call the numAddressesWhitelisted from the contract
     const _numberOfWhitelisted =
     await whitelistContract.numAddressesWhitelisted();
     setNumberOfWhitelisted(_numberOfWhitelisted);
    }
    catch(err){
      console.error(err);
    }
  };
  /**
   * checkIfAddressInWhitelist: checks if the address is in whitelist
   * 
   */
  const checkIfAddressInWhitelist = async () =>{
    try{
      //we will need the signer later to get the user's address
      //even though it is a read transaction, since Signers are just special kind of Providers,
      //We can use it in its place
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(
        WHITELIST_CONTRACT_ADDRESS, abi, signer
      );
      //get the address associated to the signer which is connected to the Metamask
      const address = await signer.getAddress();
      //call the whitelistedAddresses from the contract
      const _joinedWhitelisted = await whitelistContract.whitelistedAddresses(
        address
      );
      setJoinedWhitelist(_joinedWhitelisted);
    }
    catch (err) {
      console.error(err);
    }
  };
  /**
   * connectWallet: Connects the Metamask wallet
   */
  const connectWallet = async() =>{
    try{
      //Get the provider from web3Modal, which in our case is Metamask
      //When used for the first time, it prompts the user to connects their wallet
      await getProviderOrSigner();
      setWalletConnected(true);

      checkIfAddressInWhitelist();
      getNumberOfWhitelisted();
      }
      catch(err) {
        console.error(err);
      }
    };
    /**
     * renderButton: Returns a button based on the state of the dapp
     * 
     */
    const renderButton = () =>{
      if(walletConnected) {
        if (joinedWhitelist) {
          return (
              <div className={styles.description}>
                Thanks for joining the Whitelist!
              </div>
          );
        }
        else if(loading){
          return <button className={styles.button}>Loading...</button>

        }
        else{
          return (
            <button onClick={addAddressToWhitelist} className={styles.button}>
              Joint the Whitelist
            </button>
          );
        }
      }
      else{
        return (
          <button onClick={connectWallet} className={styles.button}>
            Connect your Wallet
          </button>
        );
      }
    };

    //useEffect are used to react to changes in state of the website
    //The array at the end of the function call represents what state changes will trigger this effect
    //In this, whenever the value of `walletConected` changes - this effect will be called
    useEffect(() =>{
      //if wallet is not connected, create a new instance of Web3Modal and `connect` the Metamask wallet
      if (!walletConnected){
        //assign the Web3Modal class to the reference object by setting it's `current` value
        //The `current` value is persisted throughout as long as this page is open
        web3modalRef.current = new Web3Modal({
          network: "goerli",
          providerOptions: {},
          disableInjectedProvider: false,
        });
        connectWallet();
      }
    }
      , [walletConnected]
    );
  
  return (
    <div>
      <Head>
        <title>Whitelist Dapp</title>
        <meta name="description" content="Whitelistdapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
            <div>
                <h1 className={styles.title}>Welcome to Crypto-Dev!</h1>
                <div className={styles.description}>
                    Its an NFT collection for deverlopers in Crypto.
                </div>
                <div className={styles.description}>
                    {numberOfWhitelisted} have already joind the whitelisted
                </div>
                {renderButton()} 
            </div>
            <div>
                <img className={styles.image} src="./crypto-devs.svg" alt="crypto-devs svg" />
            </div>
        </div>


      <footer className={styles.footer}>
        Made with &#10084; by Crepto Devs
      </footer>
      
    </div>
  );
}
