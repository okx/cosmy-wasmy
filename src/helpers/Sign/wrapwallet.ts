
import { EthSecp256k1HdWallet } from './ethsecp256k1hdwallet';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { Secp256k1HdWallet } from "@cosmjs/launchpad";
import {DirectSecp256k1HdWalletOptions} from "@cosmjs/proto-signing/build/directsecp256k1hdwallet"

export const SIGN_TYPE = {
    ethsecp256: 'ethsecp256',
    tmsecp256: 'tmsecp256'
};

export class WrapWallet {
    private signType;
    public mnemonic;

    constructor(type, mnemonic, options) {
        this.mnemonic = mnemonic;
        this.signType = WrapWallet.isEthSecp256(type) ? SIGN_TYPE.ethsecp256 : SIGN_TYPE.tmsecp256;;
    }

    static async fromMnemonic(type: string, mnemonic: string, options?: Partial<DirectSecp256k1HdWalletOptions>): Promise<WrapWallet>{
        return new WrapWallet(type, mnemonic, {
            ...options,
        });
    }

    static async generate(type, length, options = {}) {
        if (WrapWallet.isEthSecp256(type)){
            return EthSecp256k1HdWallet.generate(length, options);
        }
        return DirectSecp256k1HdWallet.generate(length, options);
    }

    static isEthSecp256(type){
        if (typeof type !== "undefined" && type !== null && type !== "" && type === SIGN_TYPE.ethsecp256){
            return true;
        }
        return false;
    }

    async signDirect(signerAddress, signDoc) {
        let wallet = await this.getWallet();
        return wallet.signDirect(signerAddress, signDoc);
    }

    async signAmino(signerAddress, signDoc) {
        let wallet = (this.signType === SIGN_TYPE.ethsecp256) ? (await EthSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
            prefix: global.workspaceChain.addressPrefix,
        },)) : (await Secp256k1HdWallet.fromMnemonic(this.mnemonic, {
            prefix: global.workspaceChain.addressPrefix,
        }));

        return wallet.signAmino(signerAddress, signDoc);
    }

    public async getAccounts() {
        return (await this.getWallet()).getAccounts();
    }

    async getWallet(){
        if (this.signType !== SIGN_TYPE.ethsecp256){
            return DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
                prefix: global.workspaceChain.addressPrefix,
            },);
        }
        return EthSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
            prefix: global.workspaceChain.addressPrefix,
        },);
    }

}
exports.WrapWallet = WrapWallet;
