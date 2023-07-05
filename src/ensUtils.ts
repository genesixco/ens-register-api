import 'dotenv/config'
import { ethers } from 'ethers'
import * as crypto from 'crypto'
import { ENSRegistry } from '@ensdomains/ens-contracts'
import { address as ETHRegistrarControllerAddr, abi as EthRegistrarControllerAbi } from '../abis/ETHRegistrarController.json'
import { address as ETHRegistrarAddr, abi as EthRegistrarAbi } from '../abis/ETHRegistrar.json'
import { abi as ENSResolverAbi } from '../abis/ENSResolver.json'
import axios from 'axios'



const provider = new ethers.AlchemyProvider(process.env.ALCHEMY_NETWORK, process.env.ALCHEMY_API_KEY!)
const wallet = new ethers.Wallet(process.env.WALLET_KEY!, provider)
const walletWithProvider = wallet.connect(provider)

const ensRegistry = new ethers.Contract(process.env.ENS_REGISTRY_ADDRESS!, ENSRegistry, walletWithProvider)
const ethRegistrar = new ethers.Contract(ETHRegistrarAddr, EthRegistrarAbi, walletWithProvider)
const ethRegistryController = new ethers.Contract(ETHRegistrarControllerAddr, EthRegistrarControllerAbi, walletWithProvider)


export async function makeCommitment(name: string, address: string) {
    try {

        const domainOwner = await ensRegistry.owner(ethers.namehash(name + ".eth"))

        if (domainOwner === ethers.ZeroAddress) {
            const node = ethers.namehash("resolver.eth");
            const addrResolver = await ensRegistry.resolver(node)

            // Generate a random value to mask our commitment
            const random = crypto.randomBytes(32)
            const salt = "0x" + Array.from(random).map(b => b.toString(16).padStart(2, "0")).join("");

            // Submit our commitment to the smart contract
            const commitment = await ethRegistryController.makeCommitmentWithConfig(name, wallet.address, salt, addrResolver, address);
            const tx = await ethRegistryController.commit(commitment);

            console.info(`Function: makeCommitment() Name: ${name}, Wallet: ${wallet.address}, Salt: ${salt}, Resolver: ${addrResolver}, Address: ${address}`)

            return { salt: salt, tx: tx.hash }
        } else {
            console.info('The domain', name, 'is not available');
            return { available: false };
        }

    } catch (error) {
        console.error(`Function: makeCommitment() Name: ${name}, address: ${address}, error: ${error}`)
        throw error
    }
}


export async function register(name: string, duration: number, salt: string, address: string): Promise<string> {
    try {

        // Add 10% to account for price fluctuation; the difference is refunded.
        const price = BigInt((await ethRegistryController.rentPrice(name, duration))) * BigInt(11) / BigInt(10);

        const node = ethers.namehash("resolver.eth");
        const addrResolver = await ensRegistry.resolver(node)

        const tx = await ethRegistryController.registerWithConfig(name, wallet.address, duration, salt, addrResolver, address, { value: price })

        console.info(`Function: register(), Name: ${name}, Wallet: ${wallet.address}, Duration: ${duration}, Salt: ${salt}, Resolver: ${addrResolver}, Address: ${address}`)

        return tx.hash

    } catch (error) {
        console.error(`Function: register() Name: ${name}, duration: ${duration}, salt: ${salt}, address: ${address}, error: ${error}`)
        throw error
    }

}

export async function checkAvailability(name: string): Promise<boolean> {
    try {

        const available = await ethRegistryController.available(name)

        return available as boolean

    } catch (error) {
        console.error(`Function: checkAvailability() Name: ${name}, error: ${error}`)
        throw error
    }
}


type SetAddressResult = {
    error?: string;
    tx?: string;
};

export async function setAddress(name: string, newAddress: string): Promise<SetAddressResult> {

    try {

        const validAddress = ethers.isAddress(newAddress)

        if (!validAddress) {
            return { error: "New Addres is not a valid ethereum address" }
        }

        const available = await ethRegistryController.available(name)

        if (available) {
            return { error: "This ENS is not registered" }
        }

        const nodeName = ethers.namehash(name + '.eth')
        const addrResolver = await ensRegistry.resolver(nodeName)
        const ensResolver = new ethers.Contract(addrResolver, ENSResolverAbi, walletWithProvider)

        const currentAddress = await ensResolver.addr(nodeName)

        if (newAddress === currentAddress) {
            return { error: "The resolver is already resolving to this address" }
        }

        const domainOwner = await ensRegistry.owner(ethers.namehash(name + '.eth'))

        if (domainOwner !== wallet.address) {
            return { error: "This ENS has not been registered with this api" }
        }

        const tx = await ensResolver.setAddr(nodeName, newAddress)

        return { tx: tx.hash }

    } catch (error) {
        console.error(`Function: setAddress() Name: ${name}, newAddress: ${newAddress}, error: ${error}`)
        throw error
    }
}


export async function getRegisteredENS() {

    const getRegisteredENSQuery = `
        query {
            domains(where: {owner: "${wallet.address}"}) {
              id
              name
              labelName
              labelhash
            }
          }
        `
    try {

        const { data } = await axios.post(`https://api.thegraph.com/subgraphs/name/ensdomains/ens`, { query: getRegisteredENSQuery });

        return data.data;

    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }

}


export async function getEnsInfo(name: string) {

    const getEnsInfo = `
        query {
            domains(where: {labelName: "${name}"}) {
            id
            name
            labelName
            labelhash
            expiryDate
            }
        }
      `

    try {

        const { data } = await axios.post(`https://api.thegraph.com/subgraphs/name/ensdomains/ens`, { query: getEnsInfo });

        return data.data;

    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function transferEns(name: string, newOwner: string) {

    try {
  
        const labelNameHash = ethers.keccak256(ethers.toUtf8Bytes(name))
        const tokenId = ethers.toBigInt(labelNameHash).toString()

        console.log(tokenId)

        const tokenOwner = await ethRegistrar.ownerOf(tokenId)

        if (tokenOwner !== wallet.address) {
            return { error: "This ENS is not our own" }
        }

        const tx = await ethRegistrar.safeTransferFrom(wallet.address, newOwner, tokenId)

        return { tx: tx.hash }

    } catch (error) {
        console.error(`Function: transferEns() Name: ${name}, address: ${newOwner}`)
        throw error;
    }

}


export async function transferRegister(name: string, newOwner: string) {

    try {

        const domainOwner = await ensRegistry.owner(ethers.namehash(name + ".eth"))

        if (domainOwner !== wallet.address) {
            return { error: "This Domain is not our own" }
        }

        const nodeName = ethers.namehash(name + '.eth')
        const tx = await ensRegistry.setOwner(nodeName, newOwner)

        return { tx: tx.hash }

    } catch (error) {
        console.error(`Function: transferEns() Name: ${name}, address: ${newOwner}`)
        throw error;
    }

}


