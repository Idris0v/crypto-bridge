import { task } from "hardhat/config";
import { writeFileSync } from 'fs';

task('swap', 'bridge tokens')
    .addParam('chainid', 'chain id')
    .addParam('tokenFrom', 'token address')
    .addParam('tokenTo', 'token address')
    .addParam('amount', 'amount to swap')
    .setAction(async ({ amount, tokenFrom, tokenTo, chainid }, { ethers }) => {
        if (!process.env.BRIDGE_ADDRESS) {
            throw new Error('process.env.BRIDGE_ADDRESS is not provided');
        }

        const bridge = await ethers.getContractAt(
            "Bridge",
            process.env.BRIDGE_ADDRESS
        );

        const tx = await bridge.swap(chainid, tokenFrom, tokenTo, amount);
        const receipt = await tx.wait();
        const event: any = receipt.events?.filter(x => {
            return x.event === 'SwapInitialized';
        })[0];
        const { initiator,
            chainFrom,
            chainTo,
            nonce
        } = event.args;
        const msg = ethers.utils.solidityKeccak256(['address', 'address', 'address', 'uint256', 'uint8', 'uint8', 'uint256'], [initiator, tokenFrom, tokenTo, amount, chainFrom, chainTo, nonce]);
        const [owner] = await ethers.getSigners();
        const signature = await owner.signMessage(ethers.utils.arrayify(msg));
        const { v, r, s } = ethers.utils.splitSignature(signature);
        const output = JSON.stringify({ initiator, tokenFrom, tokenTo, amount, chainFrom, chainTo, nonce, v, r, s });
        writeFileSync('./swap-output.json', output);
    });
