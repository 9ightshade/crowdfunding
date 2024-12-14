import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader, Loader2, Plus, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { id, isAddress } from "ethers";
import { readContract } from "@wagmi/core";
import { config } from "@/lib/wagmi";
import { crowdfundingAbi } from "@/generated";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/abi";



export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { address: currentAccount } = useAccount();
  const { writeContract } = useWriteContract();

  const [transferAddress, setTransferAddress] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownedNFTs, setOwnedNFTs] = useState<
    { tokenId: number; uri: string }[]
  >([]);


  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const queryClient = useQueryClient()



  const {
    data: balance,
    isLoading: fetchingBalanceNFTs,
    refetch: refetchBalanceNFTs,
    queryKey: getCampaignQueryKey
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "",
    args: [],
  });

  const {
    isLoading: waitingForTxn,
    isSuccess: txIsSuccess,
    isError: txIsError,
    error: txError,
  } = useWaitForTransactionReceipt();

  // Fetch owned NFTs
  useEffect(() => {
    const fetchOwnedNFTs = async () => {
      if (!currentAccount) return;

      try {

        // Brute force search for owned NFTs (less efficient)
        const nfts: { tokenId: number; uri: string }[] = [];

        if (balance) {
          for (let tokenId = BigInt(0); tokenId < balance; tokenId++) {
            // Multiplied by 2 to ensure coverage
            try {
              const owner = await readContract(config, {
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: "ownerOf",
                args: [tokenId],
              });

              if (
                owner &&
                owner?.toLowerCase() === currentAccount.toLowerCase()
              ) {
                const uri = await readContract(config, {
                  address: CONTRACT_ADDRESS,
                  abi: CONTRACT_ABI,
                  functionName: "tokenURI",
                  args: [tokenId],
                });
                nfts.push({
                  tokenId: Number(BigInt(balance).toString(10)),
                  uri,
                });
              }
            } catch (err) {
              // Token likely doesn't exist, continue searching
              continue;
            }
          }
        }

        setOwnedNFTs(nfts);
      } catch (err) {
        setError("Failed to fetch NFTs");
      }
    };

    fetchOwnedNFTs();
  }, [currentAccount]);

  const handleCreateCampaign = async () => {
    if (!currentAccount || !title || !deadline || !amount || !description) return;

    const deadlineTime = new Date(deadline).getTime()

    try {
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "createCampaign",
          args: [title, description, BigInt(amount), BigInt(deadlineTime)],
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getCampaignQueryKey })
            toast.success("Create Campaign Succesfully...")
          },
          onError: (error) => {
            toast.error("Failed to create campaign: " + error.message)
          },
        }
      );
    } catch (error) {
      toast.error("Failed to create campaign: " + (error as Error).message)
    }
  };

  const handleContribute = async () => {
    if (!selectedTokenId || !transferAddress || !isAddress(transferAddress))
      return;

    try {


      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "contribute",
          // @ts-expect-error transferAddress
          args: [currentOwner, transferAddress, BigInt(selectedTokenId)],
        },
        {
          onSuccess: () => {

          },
          onError: (error) => {
            setError("Failed to transfer NFT: " + error.message);
          },
        }
      );
    } catch (error) {
      setError("Failed to transfer NFT: " + (error as Error).message);
    }
  };

  return (
    <main className="container mx-auto p-4 space-y-4">
      {!currentAccount ? (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <p className="text-gray-500">Connect your wallet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* create campaign card */}
          <Card>
            <CardHeader>
              <CardTitle>Crowd Funding</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Campaign Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </CardContent>

            <CardContent>
              <Input className=""
                type="textarea"
                placeholder="Campaign description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </CardContent>

            <CardContent>
              <Input
                placeholder="Campaign Target in ETH..."
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </CardContent>

            <CardContent>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </CardContent>

            <CardFooter>
              <Button onClick={handleCreateCampaign} disabled={!title || !description || !amount || !deadline}>
                <Plus className="mr-2 h-4 w-4" /> Create Campaign...
              </Button>
            </CardFooter>
          </Card>

          {/* Owned NFTs */}
          <Card>
            <CardHeader>
              <CardTitle>Your Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {fetchingBalanceNFTs || waitingForTxn ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="w-full h-40 bg-gray-200 rounded-lg mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : ownedNFTs.length === 0 ? (
                <div className="text-center p-4">No Campaigns found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedNFTs.map((nft, index) => (
                    <Card
                      key={`nft ${nft.tokenId}-${index}`}
                      onClick={() => setSelectedTokenId(nft.tokenId)}
                      className={`cursor-pointer ${selectedTokenId === nft.tokenId ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <CardContent className="p-4">
                        <img
                          src={nft.uri || "/api/placeholder/200/200"}
                          alt={`nft ${nft.tokenId}-${index}`}
                          className="w-full h-40 object-cover rounded-lg mb-2"
                        />
                        <h3 className="font-semibold">
                          Token ID: {nft.tokenId}
                        </h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => refetchBalanceNFTs()}
                disabled={fetchingBalanceNFTs || waitingForTxn}
              >
                <Loader2
                  className={`mr-2 h-4 w-4 ${fetchingBalanceNFTs || waitingForTxn ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardFooter>
          </Card>

          {/* Transfer NFT */}
          {selectedTokenId !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Transfer NFT</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Recipient Address"
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                />
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleContribute}
                  disabled={!isAddress(transferAddress)}
                >
                  <Send className="mr-2 h-4 w-4" /> Transfer
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Error and Transaction Status Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {fetchingBalanceNFTs ||
            (waitingForTxn && (
              <Alert variant="default">
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                <AlertDescription>
                  {fetchingBalanceNFTs
                    ? "Fetching owned NFTs..."
                    : "Transaction in progress..."}
                </AlertDescription>
              </Alert>
            ))}

          {/* Error Handling */}
          {txIsSuccess && (
            <Alert variant="default">
              <AlertDescription>Transaction successful!</AlertDescription>
            </Alert>
          )}

          {txIsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Transaction Error</AlertTitle>
              <AlertDescription>{txError?.message}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </main>
  );
}

export default Index;
