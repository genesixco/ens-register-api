import 'dotenv/config'
import { ethers } from 'ethers'
import * as crypto from 'crypto'
import { ENSRegistry } from '@ensdomains/ens-contracts'
import { address as ETHRegistrarControllerAddr, abi as EthRegistrarControllerAbi } from '../abis/ETHRegistrarController.json'

const provider = new ethers.AlchemyProvider(process.env.ALCHEMY_NETWORK, process.env.ALCHEMY_API_KEY!)
const wallet = new ethers.Wallet(process.env.WALLET_KEY!, provider)
const walletWithProvider = wallet.connect(provider)

const ensRegistry = new ethers.Contract(process.env.ENS_REGISTRY_ADDRESS!, ENSRegistry, provider)
const ensRegistryController = new ethers.Contract(ETHRegistrarControllerAddr, EthRegistrarControllerAbi, walletWithProvider)


export async function makeCommitment(name: string, address: string) {
    try {

        const domainOwner = await ensRegistry.owner(ethers.namehash(name))

        if (domainOwner === ethers.ZeroAddress) {
            const node = ethers.namehash("resolver.eth");
            const addrResolver = await ensRegistry.resolver(node)
    
            // Generate a random value to mask our commitment
            const random = crypto.randomBytes(32)
            const salt = "0x" + Array.from(random).map(b => b.toString(16).padStart(2, "0")).join("");
    
            // Submit our commitment to the smart contract
            const commitment = await ensRegistryController.makeCommitmentWithConfig(name, wallet.address, salt, addrResolver, address);
            const tx = await ensRegistryController.commit(commitment);
    
            return { salt: salt, tx: tx.hash }
        } else {
            console.log('The domain', name, 'is not available');
            return { available: false };
        }
        
    } catch (e) {
        console.error(`Function: makeCommitment() Name: ${name}, address: ${address}`)
        throw e
    }
}


export async function register(name: string, duration: number, salt: string, address: string): Promise<string> {
    try {

        // Add 10% to account for price fluctuation; the difference is refunded.
        const price = BigInt((await ensRegistryController.rentPrice(name, duration))) * BigInt(11) / BigInt(10);

        const node = ethers.namehash("resolver.eth");
        const addrResolver = await ensRegistry.resolver(node)

        console.log(name,wallet.address,duration,salt,addrResolver,address)

        const tx = await ensRegistryController.registerWithConfig(name,wallet.address,duration, salt, addrResolver, address, { value: price })

        return tx.hash

    } catch (e) {
        console.error(`Function: register() Name: ${name}, duration: ${duration}, salt: ${salt}, address: ${address}`)
        throw e
    }

}


