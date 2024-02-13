# Nostr NIP-05 Public Key Verifier

This service allows you to automatically verify that your public key is correctly associated with your NIP-05 address. The service is free to use and the identifier addresses are hosted on the `verified-nostr.com` domain.

If you appreciate this free service:
- Zap us some sats `lucas@walletofsatoshi.com`
- Donate Bitcoin on `CoinFund.app` here: https://coinfund.app/wallet/#/campaign/502a78c3d425873bbcec26d567f2dab1

## Usage

To verify your public key for a NIP-05 address, follow these steps:

1. Go to `https://verified-nostr.com`
2. Enter your username and public key (hex format) into the form provided.
3. If details are correct, it should return a success message stating what to do next.

If your public key is correctly associated with your NIP-05 address, you will see the `@verified-nostr.com` checkmark verification appear on your Nostr account. If the verification fails, nothing will show and you will need to resubmit.

## How it works

The Nostr Public Key Verifier uses the NIP-05 protocol to verify the association between your public key and your NIP-05 address. When you enter your information into the NIP-05 field of a Nostr client (such as Damus or Snort), the service generates a unique verification request that includes your NIP-05 address and public key.

The service then sends this verification request to the Nostr network, which uses relays to confirm that your public key is correctly associated with your @verfieid-nostr.com NIP-05 address. If the verification is successful, your account will show as verified.

## Security and privacy

The Nostr Public Key Verifier is designed with security and privacy in mind. The service uses HTTPS to encrypt all communication between your browser and our server, ensuring that your data is protected in transit. The service does not store your private key on the server.

## Disclaimer

This service is not affiliated with the Nostr project. The service is offered "as is" without warranty of any kind, either expressed or implied. The creators of this service do not view or save your private key and are not responsible for any damages or losses resulting from the misuse of Nostr.
