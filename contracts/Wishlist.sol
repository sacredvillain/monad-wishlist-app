// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Используем версию компилятора 0.8.20 или выше

contract Wishlist {
    // Хранилище: FID пользователя -> список его желаний (строки)
    mapping(uint256 => string[]) public userWishlists;

    // Событие при добавлении
    event ItemAdded(uint256 indexed fid, string item);

    // Добавить желание
    function addItem(uint256 fid, string memory newItem) public {
        require(bytes(newItem).length > 0, "Item cannot be empty"); // Проверка на пустоту
        userWishlists[fid].push(newItem);
        emit ItemAdded(fid, newItem);
    }

    // Получить количество желаний
    function getWishlistCount(uint256 fid) public view returns (uint256) {
        return userWishlists[fid].length;
    }

    // Получить желание по индексу (номеру)
    function getWishlistItem(uint256 fid, uint256 index) public view returns (string memory) {
        require(index < userWishlists[fid].length, "Index out of bounds");
        return userWishlists[fid][index];
    }
}