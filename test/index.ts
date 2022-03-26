import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractReceipt } from "ethers";
import { ethers, network } from "hardhat";
import { Air, Bridge } from "../typechain";

describe('Bridge', () => {
    let ethAir: Air;
    let bnbAir: Air;
    let ethBridge: Bridge;
    let bnbBridge: Bridge;
    let owner: SignerWithAddress, user1: SignerWithAddress;
    const ethChainId = 1;
    const bnbChainId = 97;
    let snap: any;

    before(async () => {
        [owner, user1] = await ethers.getSigners();
        const AirFactory = await ethers.getContractFactory("Air");
        ethAir = await AirFactory.deploy(1000000, "AIR", "AIR");
        await ethAir.deployed();
        bnbAir = await AirFactory.deploy(1000000, "AIR", "AIR");
        await bnbAir.deployed();

        const BridgeFactory = await ethers.getContractFactory("Bridge");
        ethBridge = await BridgeFactory.deploy(owner.address, ethChainId);
        await ethBridge.deployed();
        bnbBridge = await BridgeFactory.deploy(owner.address, bnbChainId);
        await bnbBridge.deployed();

        await ethBridge.updateChainById(bnbChainId, true);
        await ethBridge.updatePair(ethAir.address, bnbAir.address, true);
        await bnbBridge.updateChainById(ethChainId, true);
        await bnbBridge.updatePair(bnbAir.address, ethAir.address, true);

        snap = await network.provider.request({
            method: "evm_snapshot",
            params: []
        });
    });

    afterEach(async () => {
        await network.provider.request({
            method: "evm_revert",
            params: [snap],
        });

        snap = await network.provider.request({
            method: "evm_snapshot",
            params: []
        });
    });

    it('should swap tokens from eth to bnb', async () => {
        await ethAir.transfer(user1.address, 1000);
        await ethAir.connect(user1).approve(ethBridge.address, 1000);
        const tx = await ethBridge.connect(user1).swap(bnbChainId, ethAir.address, bnbAir.address, 100);
        expect(await ethAir.balanceOf(user1.address)).be.eq(900);
        const receipt: ContractReceipt = await tx.wait();
        const events = receipt.events?.filter(x => {
            return x.event === 'SwapInitialized';
        });
        const event = (events as any)[0];
        expect(event, 'SwapInitialized event wasn`t emitted').be.ok;
        const { initiator,
            tokenFrom,
            tokenTo,
            amount,
            chainFrom,
            chainTo,
            nonce
        } = event.args;
        expect(initiator).eq(user1.address);
        expect(tokenFrom).eq(ethAir.address);
        expect(tokenTo).eq(bnbAir.address);
        expect(amount).eq(100);
        expect(chainFrom).eq(ethChainId);
        expect(chainTo).eq(bnbChainId);
        expect(nonce).eq(1);

        const msg = ethers.utils.solidityKeccak256(['address', 'address', 'address', 'uint256', 'uint8', 'uint8', 'uint256'], [initiator, tokenFrom, tokenTo, amount, chainFrom, chainTo, nonce]);

        const signature = await owner.signMessage(ethers.utils.arrayify(msg));
        const { v, r, s } = ethers.utils.splitSignature(signature);
        await bnbBridge.connect(user1).redeem(initiator, chainFrom, tokenFrom, tokenTo, amount, nonce, v, r, s);
        expect(await bnbAir.balanceOf(user1.address)).be.eq(100);
    });

    it('should swap tokens from bnb to eth', async () => {
        await bnbAir.transfer(user1.address, 1000);
        await bnbAir.connect(user1).approve(bnbBridge.address, 1000);
        const tx = await bnbBridge.connect(user1).swap(ethChainId, bnbAir.address, ethAir.address, 100);
        expect(await bnbAir.balanceOf(user1.address)).be.eq(900);
        const receipt: ContractReceipt = await tx.wait();
        const events = receipt.events?.filter(x => {
            return x.event === 'SwapInitialized';
        });
        const event = (events as any)[0];
        expect(event, 'SwapInitialized event wasn`t emitted').be.ok;
        const { initiator,
            tokenFrom,
            tokenTo,
            amount,
            chainFrom,
            chainTo,
            nonce
        } = event.args;

        const msg = ethers.utils.solidityKeccak256(['address', 'address', 'address', 'uint256', 'uint8', 'uint8', 'uint256'], [initiator, tokenFrom, tokenTo, amount, chainFrom, chainTo, nonce]);

        const signature = await owner.signMessage(ethers.utils.arrayify(msg));
        const { v, r, s } = ethers.utils.splitSignature(signature);
        await ethBridge.connect(user1).redeem(initiator, chainFrom, tokenFrom, tokenTo, amount, nonce, v, r, s);
        expect(await ethAir.balanceOf(user1.address)).be.eq(100);
    });
});