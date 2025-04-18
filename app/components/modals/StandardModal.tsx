"use-client";
import React, { useState, useEffect, useLayoutEffect, Fragment } from "react";
import "./modal.css";
import { CloseIcon } from "../../../public/assets/svg/index";
import { ThirdwebSDK, useSigner, useAddress } from "@thirdweb-dev/react";
import SPT721Abi from "@/abi/SptERC721.json";
import SPT1155ABI from "@/abi/SptERC1155.json";
import { useStorageUpload } from "@thirdweb-dev/react";
import ActionBtn from "../Button/ActionBtn";
import { TraitsProps } from "@/app/(create)/single-nft/page";
import { CreateSingleNFTProps } from "@/types";

import { BiSolidError } from "react-icons/bi";

interface modalProps {
  showHeader?: boolean;
  children?: any;
  closeModal: (e: React.MouseEvent<HTMLElement>) => void;
  onConfirm: (e: React.MouseEvent<HTMLElement>) => void;
  showCloseIcon?: boolean;
  showfooter?: boolean;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  closeButtonClassName?: string;
  showConfirmButton?: boolean;
  confirmButtonLabel?: string;
  confirmButtonClassName?: string;
  headerClassName?: string;
  isConfirmButtonDisabled?: boolean;
  loading?: boolean;
  modalWidth?: string;
  modalBodyClasses?: string;
  modalFooterClasses?: string;
  singleNFTData: {
    logo: string;
    name: string;
    desc: string;
    external_link: string;
    traits: TraitsProps[];
    collectionAddress: string;
    supply?: number;
    ercType?: "erc 1155" | "erc 721";
  };
  setOpenModal: any;
  openModal: boolean;
  contractAddress: string;
  isMinted: boolean;
  setIsMinted: any;
  mintedNFTData: any;
  setMintedNFTData: any;
}

const StandardModal = ({
  showHeader,
  children,
  closeModal,
  onConfirm,
  showCloseIcon,
  showfooter,
  showCloseButton,
  closeButtonLabel,
  closeButtonClassName,
  showConfirmButton,
  confirmButtonLabel,
  confirmButtonClassName,
  headerClassName,
  loading,
  modalWidth,
  isConfirmButtonDisabled,
  modalBodyClasses,
  modalFooterClasses,
  singleNFTData,
  contractAddress,
  isMinted,
  setIsMinted,
  mintedNFTData,
  setMintedNFTData,
  setOpenModal,
  openModal,
}: modalProps) => {
  const { mutateAsync: upload, isLoading } = useStorageUpload();
  const [loadingA, setLoadingA] = useState<boolean>(true);
  const [loadingB, setLoadingB] = useState<boolean>(true);
  const [loadingC, setLoadingC] = useState<boolean>(true);
  const [errorA, setErrorA] = useState<boolean>(false);
  const [errorB, setErrorB] = useState<boolean>(false);
  const [errorC, setErrorC] = useState<boolean>(false);
  const signer = useSigner();
  const [singleCreatedNFT, setSingleCreatedNFT] =
    useState<CreateSingleNFTProps | null>(null);
  const [tokenURI, setTokenURI] = useState<any>();
  const [fullURI, setFullURI] = useState<any>();
  const address = useAddress();
  const findByKey = (name: string) =>
    children.map((child: { key: any }) => {
      if (child.key === name) return child;
    });

  const onCloseModal = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    return closeModal(e);
  };

  //Thirdweb method
  // const { contract, isLoading: isContractLoading } = useContract(
  //   singleNFTData.collectionAddress,
  //   SPT721Abi
  // );
  let isMinting = false;
  const handleSingleNFTMint = async () => {
    console.log("handleSingleNFTMint called");

    if (isMinting) return;
    isMinting = true;
    try {
      let tokenURI;
      const imageToUpload = [singleNFTData.logo];
      const imageURI = await upload({ data: imageToUpload });
      console.log(imageURI);
      tokenURI = imageURI[0];
      const ipfsGateway = "https://ipfs.io/ipfs/";
      const ipfsUrl = imageURI[0].replace("ipfs://", "");
      const httpsImageUrl = `${ipfsGateway}${ipfsUrl}`;
      setTokenURI(httpsImageUrl);
      setLoadingA(false);
      // Uploading MetaDATA to IPFS
      const filesToUpload = {
        name: singleNFTData.name,
        ...(singleNFTData.desc && { description: singleNFTData.desc }),
        image: tokenURI,
        ...(singleNFTData.external_link && {
          external_url: singleNFTData.external_link,
        }),
        ...(singleNFTData.traits.length > 0 && {
          traits: singleNFTData.traits,
        }),
      };
      const metaDataURI = await upload({ data: [filesToUpload] });
      setFullURI(metaDataURI[0]);
      setLoadingB(false);
      console.log(metaDataURI[0]);
      // Step 2: Check if signer is defined
      if (!signer) {
        console.error("Wallet is not connected. Signer is undefined.");
        return;
      }
      const sdk = new ThirdwebSDK(signer);
      const customContract = await sdk.getContract(
        singleNFTData.collectionAddress,
        singleNFTData.ercType === "erc 721" ? SPT721Abi : SPT1155ABI // Pass your custom ABI here
      );
      console.log(singleNFTData.collectionAddress);
      console.log(SPT721Abi);
      try {
        let data: any;
        if (singleNFTData.ercType === "erc 721") {
          data = await customContract.call("safeMint", [metaDataURI[0]]);
        }
        if (singleNFTData.ercType === "erc 1155") {
          data = await customContract.call("mintToken", [
            address,
            metaDataURI[0],
            singleNFTData.supply,
          ]);
        }
        setLoadingC(false);
        console.log(data);
        setMintedNFTData({
          tokenURI: httpsImageUrl,
          metaDataURI: metaDataURI[0],
          transactionHash: data.receipt.transactionHash,
        });
        setOpenModal(false);
        setIsMinted(true);
      } catch (error) {
        setLoadingC(false);
        setErrorC(true);
        console.error("Contract call failed", error);
      }

      //setSingleCreatedNFT(data);
    } catch (error: any) {
      console.log(error.message);
      setOpenModal(false);
      //alert(error.message);
    } finally {
      isMinting = false;
    }
  };
  useEffect(() => {
    if (contractAddress && !isMinted) {
      handleSingleNFTMint();
    } else {
      console.log("ContractAddress is not set or already minted");
    }
  }, [contractAddress, isMinted]);
  return (
    <>
      {/* Uploading Modal */}
      <div className="modal-mask modal-close">
        <div className="modal-wrapper">
          <div
            className="modal-container"
            style={{
              maxWidth: modalWidth ? modalWidth : "543px",
              minWidth: modalWidth ? modalWidth : "543px",
            }}
          >
            {showCloseIcon && (
              <button onClick={onCloseModal} className="close-button ">
                <CloseIcon />
              </button>
            )}

            {showHeader && (
              <div
                className={`modal-header ${
                  headerClassName ? headerClassName : ""
                }`}
              >
                <Fragment key="header">
                  <div className="flex items-center">
                    <h4 className="text-lg semibold text-white">
                      Minting you NFT
                    </h4>
                  </div>
                </Fragment>
              </div>
            )}

            <div className={`modal-body ${modalBodyClasses}`}>
              <Fragment key="body">
                <div className="flex   pb-0 flex-col items-center justify-center gap-6 ">
                  {/* start */}
                  <div className="w-full flex items-center gap-4">
                    {loadingA ? (
                      <svg
                        className="animate-spin h-8 w-8 mr-3 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                    ) : (
                      <>
                        {errorA ? (
                          <span className="text-red-500 bg-blue-btn w-10 h-10 flex items-center justify-center">
                            <BiSolidError />
                          </span>
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-blue-btn flex items-center justify-center">
                            <input
                              type="checkbox"
                              name=""
                              id=""
                              className="w-4 h-4 accent-blue-btn"
                              checked
                            />
                          </span>
                        )}
                      </>
                    )}

                    <div className="flex flex-col">
                      <p className="regular text-white text-sm ">
                        Uploading to decentralized server.
                      </p>
                      <p className="light text-[#ababab] text-xs">
                        This may take a few minutes.
                      </p>
                      {errorA && (
                        <p className="text-xs text-red-500 mt-1">failed !</p>
                      )}
                    </div>
                  </div>
                  {/* end  */}
                  {/* start */}
                  <div className="w-full flex items-center gap-4">
                    {loadingB ? (
                      <svg
                        className="animate-spin h-8 w-8 mr-3 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                    ) : (
                      <>
                        {errorB ? (
                          <span className="text-red-500 bg-blue-btn w-10 h-10 flex items-center justify-center">
                            <BiSolidError />
                          </span>
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-blue-btn flex items-center justify-center">
                            <input
                              type="checkbox"
                              name=""
                              id=""
                              className="w-4 h-4 accent-blue-btn"
                              checked
                            />
                          </span>
                        )}
                      </>
                    )}
                    <div className="flex flex-col">
                      <p className="regular text-white text-sm ">
                        Uploading MetaData.
                      </p>
                      <p className="light text-[#ababab] text-xs">
                        This may take a few minutes.
                      </p>
                      {errorB && (
                        <p className="text-xs text-red-500 mt-1">failed !</p>
                      )}
                    </div>
                  </div>
                  {/* end  */}
                  {/* start */}
                  <div className="w-full flex items-center gap-4">
                    {loadingC ? (
                      <svg
                        className="animate-spin h-8 w-8 mr-3 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                    ) : (
                      <>
                        {errorC ? (
                          <span className="text-red-500 bg-blue-btn w-10 h-10 flex items-center justify-center">
                            <BiSolidError />
                          </span>
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-blue-btn flex items-center justify-center">
                            <input
                              type="checkbox"
                              name=""
                              id=""
                              className="w-4 h-4 accent-blue-btn"
                              checked
                            />
                          </span>
                        )}
                      </>
                    )}
                    <div className="flex flex-col">
                      <p className="regular text-white text-sm ">
                        Awaiting Approval from Wallet.
                      </p>
                      <p className="light text-[#ababab] text-xs">
                        This may take a few minutes.
                      </p>
                      {errorC && (
                        <p className="text-xs text-red-500 mt-1">failed !</p>
                      )}
                    </div>
                  </div>
                  {/* end  */}
                </div>
              </Fragment>
            </div>

            {showfooter && (
              <div className={`modal-footer ${modalFooterClasses}`}>
                {showCloseButton && (
                  <ActionBtn
                    name={closeButtonLabel ? closeButtonLabel : "Cancel"}
                    //   className={closeButtonClassName ? closeButtonClassName : ""}
                    action={onCloseModal}
                  />
                )}

                {showConfirmButton && (
                  <ActionBtn
                    name={confirmButtonLabel ? confirmButtonLabel : "Confirm"}
                    //   className={
                    //     confirmButtonClassName ? confirmButtonClassName : ""
                    //   }

                    action={onConfirm}
                    loading={loading}
                    disabled={isConfirmButtonDisabled}
                  />
                )}
                <Fragment key="footer"></Fragment>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StandardModal;
