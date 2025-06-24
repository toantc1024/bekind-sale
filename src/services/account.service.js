import { supabaseClient } from "../libs/supabase";

/**
 * Get account by phone number
 * @param {string} phoneNumber - The phone number to search for
 * @returns {Promise<object|null>} The account object or null
 */
export const getAccountByPhone = async (phoneNumber) => {
  const { data, error } = await supabaseClient
    .from("Account")
    .select("*")
    .eq("phone_number", phoneNumber)
    .single();

  if (error) {
    console.error("Error fetching account by phone:", error);
    return null;
  }

  return data;
};

/**
 * Create a new account
 * @param {string} fullName - The user's full name
 * @param {string} phoneNumber - The user's phone number
 * @param {string} role - The user's role
 * @returns {Promise<object>} Object containing data and message
 */
export const createAccount = async (fullName, phoneNumber, role) => {
  const existingAccount = await getAccountByPhone(phoneNumber);

  if (existingAccount) {
    return { data: null, message: "Số điện thoại đã được sử dụng" };
  }

  const accountData = {
    full_name: fullName,
    phone_number: phoneNumber,
    role: role,
  };

  const { data: newAccount, error } = await supabaseClient
    .from("Account")
    .insert(accountData)
    .select()
    .single();

  if (error) {
    console.error("Error creating account:", error);
    return { data: null, message: "Lỗi khi tạo tài khoản" };
  }

  return { data: newAccount, message: "Tạo tài khoản thành công" };
};

/**
 * Get all accounts
 * @returns {Promise<object>} Object containing data and message
 */
export const getAllAccounts = async () => {
  const { data, error } = await supabaseClient.from("Account").select("*");

  if (error) {
    console.error("Error fetching accounts:", error);
    return {
      data: null,
      message: "Không có tài khoản nào hoặc lỗi khi lấy dữ liệu",
    };
  }

  return { data, message: "Danh sách tài khoản đã được lấy thành công" };
};

/**
 * Update an account
 * @param {string|number} accountId - The account ID to update
 * @param {object} data - The data to update
 * @returns {Promise<object>} Object containing data and message
 */
export const updateAccount = async (accountId, data) => {
  const { data: updatedAccount, error } = await supabaseClient
    .from("Account")
    .update(data)
    .eq("id", accountId)
    .select()
    .single();

  if (error) {
    console.error("Error updating account:", error);
    return { data: null, message: "Lỗi khi cập nhật tài khoản" };
  }

  return { data: updatedAccount, message: "Cập nhật tài khoản thành công" };
};

/**
 * Delete an account
 * @param {string|number} accountId - The account ID to delete
 * @returns {Promise<object>} Object containing success status and message
 */
export const deleteAccount = async (accountId) => {
  const { data, error } = await supabaseClient
    .from("Account")
    .delete()
    .eq("id", accountId)
    .select();

  if (error) {
    console.error("Error deleting account:", error);
    return { success: false, message: "Lỗi khi xóa tài khoản" };
  }

  return { success: true, message: "Xóa tài khoản thành công" };
};

/**
 * Get mapping of account IDs to full names for dropdown selections
 * @returns {Promise<object>} Object containing nameMap and message
 */
export const getAccountNameMap = async () => {
  const { data, error } = await supabaseClient
    .from("Account")
    .select("id, full_name");

  if (error) {
    console.error("Error fetching account names:", error);
    return {
      nameMap: {},
      message: "Không có tài khoản nào hoặc lỗi khi lấy dữ liệu",
    };
  }

  const nameMap = data.reduce((map, account) => {
    map[account.id] = account.full_name;
    return map;
  }, {});

  return { nameMap, message: "Danh sách tài khoản đã được lấy thành công" };
};

/**
 * Get mapping of manager account IDs to full names (only accounts with 'Quản lý' role)
 * @returns {Promise<object>} Object containing nameMap and message
 */
export const getManagersNameMap = async () => {
  try {
    const { data, error } = await supabaseClient
      .from("Account")
      .select("id, full_name, role");

    if (error) {
      throw error;
    }

    // Filter accounts with exact role "Quản lý" (case-sensitive)
    const managers = data.filter((account) => account.role === "Quản lý");

    const nameMap = managers.reduce((map, account) => {
      map[account.id] = account.full_name;
      return map;
    }, {});

    return { nameMap, message: "Danh sách quản lý đã được lấy thành công" };
  } catch (error) {
    console.error("Error fetching managers:", error);
    return {
      nameMap: {},
      message: `Lỗi khi lấy dữ liệu quản lý: ${error.message}`,
    };
  }
};
