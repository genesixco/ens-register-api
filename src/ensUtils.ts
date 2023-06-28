import 'dotenv/config'
import { ethers, toBigInt } from 'ethers'
import * as crypto from 'crypto'
import { ENSRegistry } from '@ensdomains/ens-contracts'
import { address as ETHRegistrarControllerAddr, abi as EthRegistrarControllerAbi } from '../abis/ETHRegistrarController.json'

const provider = new ethers.AlchemyProvider("goerli", process.env.ALCHEMY_API_KEY_ETH_GOERLI!)
const wallet = new ethers.Wallet(process.env.WALLET_KEY!, provider)

const ensRegistry = new ethers.Contract(process.env.ENS_REGISTRY_ADDRESS!, ENSRegistry, provider)
const ensRegistryController = new ethers.Contract(ETHRegistrarControllerAddr, EthRegistrarControllerAbi, provider)


export async function makeCommitment(name:string, owner: string) {
    // Generate a random value to mask our commitment
    const random = crypto.randomBytes(32)
    const salt = "0x" + Array.from(random).map(b => b.toString(16).padStart(2, "0")).join("");

    // Submit our commitment to the smart contract
    const commitment = await ensRegistryController.makeCommitment.staticCall(name, owner, salt);

    const tx = await ensRegistryController.commit.staticCall(commitment);

    return {salt, tx}
}


export async function register(name:string, owner:string, duration:number, salt:string) {
    try {
        // Add 10% to account for price fluctuation; the difference is refunded.
        const price = BigInt((await ensRegistryController.rentPrice(name, duration))) * BigInt(11) / BigInt(10);

        const tx = await ensRegistryController.register.staticCall(name, owner, duration, salt, { value: price });

        return tx;

    } catch (e) {
        console.log(e)
    }
}
