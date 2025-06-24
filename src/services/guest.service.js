import { supabaseClient } from "../libs/supabase";

/**
 * Get all guests with details joined from Account and House tables
 * @param {string|null} userRole - The role of the user making the request
 * @param {string|number|null} userId - The ID of the user making the request
 * @returns {Promise<object>} Object containing data and message
 */
export const getGuestsWithDetails = async (userRole = null, userId = null) => {
  try {
    let query = supabaseClient.from("Guest").select(`
        *,
        marketer:Account!Guest_marketer_id_fkey(id, full_name, phone_number),
        house:House!Guest_house_id_fkey(id, address, manager:Account!House_manager_id_fkey(id, full_name))
      `);

    // Apply role-based filtering
    if (userRole === "Marketing") {
      query = query.eq("marketer_id", userId);
    } else if (userRole === "Quản lý") {
      // First get houses managed by this manager
      const { data: houses } = await supabaseClient
        .from("House")
        .select("id")
        .eq("manager_id", userId);

      if (houses && houses.length > 0) {
        const houseIds = houses.map((house) => house.id);
        query = query.in("house_id", houseIds);
      } else {
        return { data: [], message: "Không tìm thấy nhà nào" };
      }
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching guests:", error);
      return { data: null, message: "Lỗi khi lấy dữ liệu khách" };
    }

    return {
      data,
      message:
        data.length > 0
          ? "Lấy dữ liệu khách thành công"
          : "Không tìm thấy khách nào",
    };
  } catch (error) {
    console.error("Error in getGuestsWithDetails:", error);
    return { data: null, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Create a new guest
 * @param {object} guestData - The guest data object
 * @returns {Promise<object>} Object containing data and message
 */
export const createGuest = async (guestData) => {
  try {
    // Convert date-time if needed
    if (guestData.view_date && typeof guestData.view_date === "object") {
      guestData.view_date = guestData.view_date.toISOString();
    }

    const { data, error } = await supabaseClient
      .from("Guest")
      .insert(guestData)
      .select()
      .single();

    if (error) {
      console.error("Error creating guest:", error);
      return { data: null, message: "Không thể thêm khách" };
    }

    return { data, message: "Thêm khách thành công" };
  } catch (error) {
    console.error("Error in createGuest:", error);
    return { data: null, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Update a guest with role-based restrictions
 * @param {string|number} guestId - The guest ID to update
 * @param {object} updates - The data to update
 * @param {string} userRole - The role of the user making the request
 * @param {string|number} userId - The ID of the user making the request
 * @returns {Promise<object>} Object containing data and message
 */
export const updateGuest = async (
  guestId,
  updates,
  userRole = null,
  userId = null
) => {
  try {
    // Check permissions based on role
    if (userRole === "Marketing") {
      const { data: existingGuest } = await supabaseClient
        .from("Guest")
        .select("marketer_id")
        .eq("id", guestId)
        .single();

      if (existingGuest?.marketer_id !== userId) {
        return {
          data: null,
          message: "Không có quyền cập nhật khách hàng này",
        };
      }

      // Remove marketer_id from updates for non-admin roles
      delete updates.marketer_id;
    } else if (userRole === "Quản lý") {
      // For managers, only allow updating guests in their houses
      const { data: existingGuest } = await supabaseClient
        .from("Guest")
        .select("house_id")
        .eq("id", guestId)
        .single();

      if (existingGuest) {
        const { data: house } = await supabaseClient
          .from("House")
          .select("manager_id")
          .eq("id", existingGuest.house_id)
          .single();

        if (house?.manager_id !== userId) {
          return {
            data: null,
            message: "Không có quyền cập nhật khách hàng này",
          };
        }
      }

      // Remove marketer_id from updates for non-admin roles
      delete updates.marketer_id;
    }

    // Handle view_date conversion if needed
    if (updates.view_date && typeof updates.view_date === "object") {
      updates.view_date = updates.view_date.toISOString();
    }

    const { data, error } = await supabaseClient
      .from("Guest")
      .update(updates)
      .eq("id", guestId)
      .select()
      .single();

    if (error) {
      console.error("Error updating guest:", error);
      return { data: null, message: "Không thể cập nhật" };
    }

    return { data, message: "Cập nhật thành công" };
  } catch (error) {
    console.error("Error in updateGuest:", error);
    return { data: null, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Delete a guest with role-based restrictions
 * @param {string|number} guestId - The guest ID to delete
 * @param {string} userRole - The role of the user making the request
 * @param {string|number} userId - The ID of the user making the request
 * @returns {Promise<object>} Object containing success status and message
 */
export const deleteGuest = async (guestId, userRole = null, userId = null) => {
  try {
    // Check permissions based on role
    if (userRole === "Marketing") {
      const { data: existingGuest } = await supabaseClient
        .from("Guest")
        .select("marketer_id")
        .eq("id", guestId)
        .single();

      if (existingGuest?.marketer_id !== userId) {
        return {
          success: false,
          message: "Không có quyền xóa khách hàng này",
        };
      }
    } else if (userRole === "Quản lý") {
      // For managers, only allow deleting guests in their houses
      const { data: existingGuest } = await supabaseClient
        .from("Guest")
        .select("house_id")
        .eq("id", guestId)
        .single();

      if (existingGuest) {
        const { data: house } = await supabaseClient
          .from("House")
          .select("manager_id")
          .eq("id", existingGuest.house_id)
          .single();

        if (house?.manager_id !== userId) {
          return {
            success: false,
            message: "Không có quyền xóa khách hàng này",
          };
        }
      }
    }

    const { error } = await supabaseClient
      .from("Guest")
      .delete()
      .eq("id", guestId);

    if (error) {
      console.error("Error deleting guest:", error);
      return { success: false, message: "Không thể xóa khách" };
    }

    return { success: true, message: "Xóa khách thành công" };
  } catch (error) {
    console.error("Error in deleteGuest:", error);
    return { success: false, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Get mapping of marketer IDs to names (Marketing role only)
 * @returns {Promise<object>} Object containing nameMap and message
 */
export const getMarketersNameMap = async () => {
  try {
    const { data, error } = await supabaseClient
      .from("Account")
      .select("id, full_name")
      .eq("role", "Marketing");

    if (error) {
      console.error("Error fetching marketers:", error);
      return {
        nameMap: {},
        message: "Lỗi khi lấy dữ liệu nhân viên marketing",
      };
    }

    const nameMap = data.reduce((map, account) => {
      map[account.id] = account.full_name;
      return map;
    }, {});

    return { nameMap, message: "Lấy dữ liệu nhân viên marketing thành công" };
  } catch (error) {
    console.error("Error in getMarketersNameMap:", error);
    return { nameMap: {}, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Get mapping of house IDs to addresses, optionally filtered by manager
 * @param {number} managerId - Optional manager ID to filter houses
 * @returns {Promise<object>} Object containing addressMap and message
 */
export const getHousesNameMap = async (managerId = null) => {
  try {
    let query = supabaseClient.from("House").select("id, address");

    if (managerId) {
      query = query.eq("manager_id", managerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching houses:", error);
      return { addressMap: {}, message: "Lỗi khi lấy dữ liệu nhà" };
    }

    const addressMap = data.reduce((map, house) => {
      map[house.id] = house.address;
      return map;
    }, {});

    return { addressMap, message: "Lấy dữ liệu nhà thành công" };
  } catch (error) {
    console.error("Error in getHousesNameMap:", error);
    return { addressMap: {}, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Get mapping of house IDs to addresses and manager info, optionally filtered by manager
 * @param {number} managerId - Optional manager ID to filter houses
 * @returns {Promise<object>} Object containing housesMap and message
 */
export const getHousesWithManagersMap = async (managerId = null) => {
  try {
    let query = supabaseClient
      .from("House")
      .select(
        "id, address, manager:Account!House_manager_id_fkey(id, full_name)"
      );

    if (managerId) {
      query = query.eq("manager_id", managerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching houses with managers:", error);
      return { housesMap: {}, message: "Lỗi khi lấy dữ liệu nhà" };
    }

    const housesMap = data.reduce((map, house) => {
      map[house.id] = {
        address: house.address,
        manager_name: house.manager ? house.manager.full_name : "N/A",
      };
      return map;
    }, {});

    return { housesMap, message: "Lấy dữ liệu nhà thành công" };
  } catch (error) {
    console.error("Error in getHousesWithManagersMap:", error);
    return { housesMap: {}, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Get available guest status options
 * @returns {Array<string>} List of status options
 */
export const getGuestStatusOptions = () => {
  return ["Mới", "Đã chốt", "Chuẩn bị xem", "Đang chăm sóc", "Không chốt"];
};

/**
 * Get guest statistics grouped by manager and status within date range
 * @param {string} startDate - Optional start date for filtering
 * @param {string} endDate - Optional end date for filtering
 * @param {string|null} userRole - The role of the user making the request
 * @param {string|number|null} userId - The ID of the user making the request
 * @returns {Promise<object>} Object containing analytics data and message
 */
export const getGuestAnalyticsByManager = async (
  startDate = null,
  endDate = null,
  userRole = null,
  userId = null
) => {
  try {
    let query = supabaseClient.from("Guest").select(`
        status,
        house:House!Guest_house_id_fkey(
          id,
          manager:Account!House_manager_id_fkey(id, full_name)
        )
      `);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Apply role-based filtering
    if (userRole === "Quản lý") {
      // For managers, only include houses they manage
      query = query.eq("house.manager_id", userId);
    } else if (userRole === "Marketing") {
      // Marketing can only see data for guests they've added
      query = query.eq("marketer_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching guest analytics by manager:", error);
      return { data: null, message: "Lỗi khi lấy dữ liệu phân tích" };
    }

    // Group by manager and status
    const stats = {};
    data.forEach((guest) => {
      if (guest.house && guest.house.manager) {
        const managerId = guest.house.manager.id;
        const managerName = guest.house.manager.full_name;
        const status = guest.status;

        if (!stats[managerId]) {
          stats[managerId] = {
            manager_name: managerName,
            Mới: 0,
            "Đã chốt": 0,
            "Chuẩn bị xem": 0,
            "Đang chăm sóc": 0,
            "Không xem": 0,
            "Không chốt": 0,
            total: 0,
          };
        }

        stats[managerId][status] = (stats[managerId][status] || 0) + 1;
        stats[managerId].total += 1;
      }
    });

    return {
      data: Object.values(stats),
      message: "Lấy dữ liệu phân tích thành công",
    };
  } catch (error) {
    console.error("Error in getGuestAnalyticsByManager:", error);
    return { data: null, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Get guest statistics grouped by marketer and status within date range
 * @param {string} startDate - Optional start date for filtering
 * @param {string} endDate - Optional end date for filtering
 * @param {string|null} userRole - The role of the user making the request
 * @param {string|number|null} userId - The ID of the user making the request
 * @returns {Promise<object>} Object containing analytics data and message
 */
export const getGuestAnalyticsByMarketer = async (
  startDate = null,
  endDate = null,
  userRole = null,
  userId = null
) => {
  try {
    let query = supabaseClient.from("Guest").select(`
        status,
        marketer:Account!Guest_marketer_id_fkey(id, full_name)
      `);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Apply role-based filtering
    if (userRole === "Marketing") {
      // Marketing can only see their own stats
      query = query.eq("marketer_id", userId);
    } else if (userRole === "Quản lý") {
      // Managers can only see stats for their houses
      const { data: houses } = await supabaseClient
        .from("House")
        .select("id")
        .eq("manager_id", userId);

      if (houses && houses.length > 0) {
        const houseIds = houses.map((house) => house.id);
        query = query.in("house_id", houseIds);
      } else {
        return { data: [], message: "Không tìm thấy nhà nào" };
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching guest analytics by marketer:", error);
      return { data: null, message: "Lỗi khi lấy dữ liệu phân tích" };
    }

    // Group by marketer and status
    const stats = {};
    data.forEach((guest) => {
      if (guest.marketer) {
        const marketerId = guest.marketer.id;
        const marketerName = guest.marketer.full_name;
        const status = guest.status;

        if (!stats[marketerId]) {
          stats[marketerId] = {
            marketer_name: marketerName,
            Mới: 0,
            "Đã chốt": 0,
            "Chuẩn bị xem": 0,
            "Đang chăm sóc": 0,
            "Không xem": 0,
            "Không chốt": 0,
            total: 0,
          };
        }

        stats[marketerId][status] = (stats[marketerId][status] || 0) + 1;
        stats[marketerId].total += 1;
      }
    });

    return {
      data: Object.values(stats),
      message: "Lấy dữ liệu phân tích thành công",
    };
  } catch (error) {
    console.error("Error in getGuestAnalyticsByMarketer:", error);
    return { data: null, message: `Lỗi: ${error.message}` };
  }
};

/**
 * Subscribe to guest changes in real-time
 * @param {Function} callback - Function to call when guests change
 * @returns {Function} Unsubscribe function
 */
export const subscribeToGuests = (callback) => {
  const subscription = supabaseClient
    .channel("guests-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "Guest",
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabaseClient.removeChannel(subscription);
  };
};
