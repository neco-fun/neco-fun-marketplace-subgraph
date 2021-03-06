import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  NecoMarketplace,
  BuyItem,
  ChangePrice,
  OwnershipTransferred,
  PublishNewItem,
  RevertOnListItem
} from "../generated/NecoMarketplace/NecoMarketplace"
import {
  NecoNFT
} from "../generated/NecoMarketplace/NecoNFT"

import { Marketplace, Item, User } from "../generated/schema"

let ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000")
let BIGINT_ZERO = BigInt.fromI32(0)

export function handleBuyItem(event: BuyItem): void {
  let itemId = event.params.ItemId.toHex();
  let item = Item.load(itemId);

  // update item's properties.
  if (item !== null) {
    item.isOnList = false;
    item.buyer = event.params.buyer.toHex();
    item.isSoldOut = true;
    item.soldTime = event.block.timestamp;
    item.fee = event.params.fee;
    item.save();
  }

  // update marketplace's data
  let marketAddress = event.address;
  let marketplaceId = marketAddress.toHex();
  let marketplace = Marketplace.load(marketplaceId);
  if (marketplace !== null) {
    // change sold items array
    let soldItems: string[] = marketplace.soldItems;
    soldItems.push(itemId);
    marketplace.soldItems = soldItems;

    // change onList items
    let onListItems = marketplace.onListItems;
    let index = onListItems.indexOf(itemId);
    let newOnListItems = onListItems.splice(index, 1);
    marketplace.onListItems = newOnListItems;
    marketplace.save();
  }

  // update seller's data
  let sellerId = event.params.seller.toHex();
  let seller = User.load(sellerId);
  if (seller !== null) {
    // change onList items
    let onListItems = seller.onListItems;
    let index = onListItems.indexOf(itemId);
    let newOnListItems = onListItems.splice(index, 1);
    seller.onListItems = newOnListItems;
  }

  // update buyer's data
  let buyerId = event.params.buyer.toHex();
  let buyer = User.load(buyerId);
  if (buyer === null) {
    buyer = new User(buyerId);
    buyer.address = event.params.buyer;
    buyer.onListItems = [];
    buyer.boughtItems = [];
    buyer.save();
  }
  buyer.boughtItems.push(itemId);
  buyer.save();
}

export function handleChangePrice(event: ChangePrice): void {}

export function handlePublishNewItem(event: PublishNewItem): void {
  let marketAddress = event.address;
  let marketplaceId = marketAddress.toHex();
  let marketplace = Marketplace.load(marketplaceId);

  //  get market place smart contract
  let marketplaceContract = NecoMarketplace.bind(marketAddress);

  // get nft smart contract
  let nftContract = NecoNFT.bind(marketplaceContract.necoNFT());

  if (marketplace === null) {
    marketplace = new Marketplace(marketplaceId);
    marketplace.publishedItems = [];
    marketplace.soldItems = [];
    marketplace.onListItems = [];
    marketplace.save();
  }

  // create a new user
  let userId = event.params.account.toHex()
  let user = User.load(userId);
  if (user === null) {
    user = new User(userId);
    user.address = event.params.account;
    user.onListItems = [];
    user.boughtItems = [];
    user.save();
  }

  // create a new item
  let itemId = event.params.ItemId.toHex();
  let item = Item.load(itemId);
  if (item === null) {
    item = new Item(itemId);
    item.itemId = event.params.ItemId;
    item.seller = user.id;
    item.buyer = ZERO_ADDRESS.toHex();
    item.nftId = event.params.nftId;
    item.nftUri = nftContract.uri(item.nftId);
    item.amount = event.params.amount;
    item.price = event.params.price;
    item.onListTime = event.block.timestamp;
    item.isSoldOut = false;
    item.soldTime = event.block.timestamp;
    item.isOnList = true;
    item.fee = BIGINT_ZERO;
    item.save();
  }

  let publishedItems = marketplace.publishedItems;
  publishedItems.push(item.id);
  marketplace.publishedItems = publishedItems;
  marketplace.save();

  let onListItems = user.onListItems;
  onListItems.push(item.id);
  user.onListItems = onListItems;
  user.save()
}

export function handleRevertOnListItem(event: RevertOnListItem): void {
  let itemId = event.params.ItemId.toHex();
  let item = Item.load(itemId);
  if (item !== null) {
    item.isOnList = false;
    item.save();
  }

  let userId = event.params.account.toHex()
  let user = User.load(userId);
  if (user !== null) {
    let listedItems = user.onListItems;
    let index = listedItems.indexOf(itemId);
    let newListedItems = listedItems.splice(index, 1);
    user.onListItems = newListedItems;
    user.save();
  }


  // update marketplace's data
  let marketAddress = event.address;
  let marketplaceId = marketAddress.toHex();
  let marketplace = Marketplace.load(marketplaceId);
  if (marketplace !== null) {
    // change onList items
    let onListItems = marketplace.onListItems;
    let index = onListItems.indexOf(itemId);
    let newOnListItems = onListItems.splice(index, 1);
    marketplace.onListItems = newOnListItems;
    marketplace.save();
  }
}
