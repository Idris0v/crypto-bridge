import { task } from "hardhat/config";
import { readFileSync } from 'fs';

task('redeem', 'redeem tokens')
    .setAction(async ({ }, { ethers }) => {
        if (!process.env.BRIDGE_ADDRESS) {
            throw new Error('process.env.BRIDGE_ADDRESS is not provided');
        }

        const bridge = await ethers.getContractAt(
            "Bridge",
            process.env.BRIDGE_ADDRESS
        );
        const { initiator, tokenFrom, tokenTo, amount, chainFrom, nonce, v, r, s } = JSON.parse(readFileSync('./swap-output.json', {encoding:'utf8', flag:'r'}));
        const tx = await bridge.redeem(initiator, chainFrom, tokenFrom, tokenTo, amount, nonce, v, r, s);
        await tx.wait();
    });
