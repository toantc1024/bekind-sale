import { supabaseClient } from "../libs/supabase";

/**
 * Get all houses
 * @returns {Promise<object>} Object containing data and message
 */
export const getAllHouses = async () => {
  const { data, error } = await supabaseClient.from("House").select("*");

  if (error) {
    console.error("Error fetching houses:", error);
    return {
      data: null,
      message: "Không có nhà nào hoặc lỗi khi lấy dữ liệu",
    };
  }

  return { data, message: "Danh sách nhà đã được lấy thành công" };
};

/**
 * Create a new house
 * @param {number} managerId - The ID of the manager responsible for the house
 * @param {string} address - The house address
 * @returns {Promise<object>} Object containing data and message
 */
export const createHouse = async (managerId, address) => {
  const houseData = {
    manager_id: managerId,
    address: address,
  };

  const { data: newHouse, error } = await supabaseClient
    .from("House")
    .insert(houseData)
    .select()
    .single();

  if (error) {
    console.error("Error creating house:", error);
    return { data: null, message: "Lỗi khi tạo nhà" };
  }

  return { data: newHouse, message: "Tạo nhà thành công" };
};

/**
 * Update a house
 * @param {string|number} houseId - The house ID to update
 * @param {object} data - The data to update
 * @returns {Promise<object>} Object containing data and message
 */
export const updateHouse = async (houseId, data) => {
  const { data: updatedHouse, error } = await supabaseClient
    .from("House")
    .update(data)
    .eq("id", houseId)
    .select()
    .single();

  if (error) {
    console.error("Error updating house:", error);
    return { data: null, message: "Lỗi khi cập nhật nhà" };
  }

  return { data: updatedHouse, message: "Cập nhật nhà thành công" };
};

/**
 * Delete a house
 * @param {string|number} houseId - The house ID to delete
 * @returns {Promise<object>} Object containing success status and message
 */
export const deleteHouse = async (houseId) => {
  const { data, error } = await supabaseClient
    .from("House")
    .delete()
    .eq("id", houseId)
    .select();

  if (error) {
    console.error("Error deleting house:", error);
    return { success: false, message: "Lỗi khi xóa nhà" };
  }

  return { success: true, message: "Xóa nhà thành công" };
};

/**
 * Get house by ID
 * @param {string|number} houseId - The house ID to retrieve
 * @returns {Promise<object|null>} The house object or null
 */
export const getHouseById = async (houseId) => {
  const { data, error } = await supabaseClient
    .from("House")
    .select("*")
    .eq("id", houseId)
    .single();

  if (error) {
    console.error("Error fetching house by ID:", error);
    return null;
  }

  return data;
};

/**
 * Get mapping of house IDs to addresses for dropdown selections
 * @returns {Promise<object>} Object containing addressMap and message
 */
export const getHouseAddressMap = async () => {
  const { data, error } = await supabaseClient
    .from("House")
    .select("id, address");

  if (error) {
    console.error("Error fetching house addresses:", error);
    return {
      addressMap: {},
      message: "Không có nhà nào hoặc lỗi khi lấy dữ liệu",
    };
  }

  const addressMap = data.reduce((map, house) => {
    map[house.id] = house.address;
    return map;
  }, {});

  return { addressMap, message: "Danh sách nhà đã được lấy thành công" };
};
