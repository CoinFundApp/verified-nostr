# Nostr NIP-05 Public Key Verifier

This service allows you to verify that your public key is correctly associated with your NIP-05 address. The service is free to use and the identifier addresses are hosted on the `verified-nostr.com` domain.

If you appreciate this free service:
- Zap us some sats `poiseddryer75@walletofsatoshi.com`
- Donate Bitcoin on `CoinFund.app` here: https://coinfund.app/app/#/campaign/c517e6d15117db9d848f600360475f8d

## Usage

To verify your public key for a NIP-05 address, follow these steps:

1. Go to `https://verified-nostr.com`
2. Enter your @username and public key (hex format) into the form provided.
3. Ensure active email address is added. Click the "Submit" button.
4. We will verify within 24-48 hours and email you once included in the verification list.

If your public key is correctly associated with your NIP-05 address, you will see the `@verified-nostr.com` checkmark verification appear on your Nostr account. If the verification fails, nothing will show and you will need to resubmit.

## How it works

The Nostr Public Key Verifier uses the NIP-05 protocol to verify the association between your public key and your NIP-05 address. When you enter your information into the NIP-05 field of a Nostr client (such as Damus or Snort), the service generates a unique verification request that includes your NIP-05 address and public key.

The service then sends this verification request to the Nostr network, which uses its distributed ledger to confirm that your public key is correctly associated with your @verfieid-nostr.com NIP-05 address. If the verification is successful, your account will show as verified.

## Security and privacy

The Nostr Public Key Verifier is designed with security and privacy in mind. The service uses HTTPS to encrypt all communication between your browser and our server, ensuring that your data is protected in transit. The service does not store your private key on the server.

## Disclaimer

This service is not affiliated with the Nostr project. The service is offered "as is" without warranty of any kind, either expressed or implied. The creators of this service do not view or save your private key and are not responsible for any damages or losses resulting from the misuse of Nostr.
