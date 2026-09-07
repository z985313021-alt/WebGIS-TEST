<template>
  <div class="profile-page" v-loading="loading">
    <!-- ===== 顶部：资料/账号卡 ===== -->
    <div class="zone profile-zone">
      <div class="zone-title">个人资料</div>
      <div class="profile-main">
        <div class="avatar-col">
          <div class="avatar-big">
            <img v-if="profile?.avatarUrl" :src="profile.avatarUrl" alt="头像"/>
            <span v-else>{{ avatarText }}</span>
          </div>
          <el-button size="small" @click="avatarEdit = true">更换头像</el-button>
        </div>
        <div class="info-col">
          <div class="info-row">
            <span class="k">显示昵称</span>
            <span class="v">{{ nickname }}</span>
            <el-button link type="primary" size="small" @click="openBasic()">编辑</el-button>
          </div>
          <div class="info-row">
            <span class="k">账号</span>
            <span class="v">{{ profile?.username }}</span>
          </div>
          <div class="info-row">
            <span class="k">角色</span>
            <span class="v">
              <el-tag size="small" :type="profile?.role === 'admin' ? 'warning' : 'info'">
                {{ profile?.role === 'admin' ? '管理员' : '普通用户' }}
              </el-tag>
            </span>
          </div>
          <div class="info-row" v-if="profile?.email">
            <span class="k">邮箱</span>
            <span class="v">{{ profile.email }}</span>
          </div>
          <div class="info-row">
            <span class="k">手机</span>
            <span class="v">{{ profile?.phone || '未绑定' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 收货地址簿 ===== -->
    <div class="zone addr-zone">
      <div class="zone-head">
        <div class="zone-title">收货地址</div>
        <el-button type="primary" size="small" @click="openAddr()">+ 新增地址</el-button>
      </div>
      <el-empty v-if="!addresses.length" description="还没有收货地址，点击右上角添加" :image-size="80" />
      <div v-else class="addr-grid">
        <div class="addr-card" v-for="a in addresses" :key="a.id" :class="{ def: a.isDefault }">
          <div class="addr-top">
            <span class="rcv">{{ a.receiver }}</span>
            <el-tag v-if="a.isDefault" size="small" type="warning">默认</el-tag>
          </div>
          <div class="addr-phone">{{ a.phone }}</div>
          <div class="addr-text">{{ a.region }} {{ a.detail }}</div>
          <div class="addr-ops">
            <el-button link type="primary" size="small" @click="openAddr(a)">编辑</el-button>
            <el-button v-if="!a.isDefault" link size="small" @click="onSetDefault(a)">设为默认</el-button>
            <el-popconfirm title="确认删除该地址？" @confirm="onDelete(a)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑基础资料 -->
    <el-dialog v-model="basicEdit" title="编辑资料" width="380px">
      <el-form label-width="70px">
        <el-form-item label="昵称">
          <el-input v-model="draft.nickname" maxlength="30" placeholder="最多 30 字（可留空则用账号名）" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="draft.phone" placeholder="11 位手机号（可不填）" @input="onPhoneInput(draft, 'phone')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="basicEdit = false">取消</el-button>
        <el-button type="primary" :loading="savingBasic" @click="saveBasic">保存</el-button>
      </template>
    </el-dialog>

    <!-- 更换头像 -->
    <el-dialog v-model="avatarEdit" title="更换头像" width="420px">
      <el-input v-model="avatarDraft" placeholder="粘贴头像图片 URL" clearable>
        <template #prepend>URL</template>
      </el-input>
      <el-divider />
      <div class="avatar-preview">
        <img v-if="avatarDraft" :src="avatarDraft" alt="预览" />
        <span v-else class="ph">{{ avatarText }}</span>
      </div>
      <template #footer>
        <el-button @click="avatarEdit = false">取消</el-button>
        <el-button type="primary" :loading="savingAvatar" @click="saveAvatar">保存头像</el-button>
      </template>
    </el-dialog>

    <!-- 新增 / 编辑地址 -->
    <el-dialog v-model="addrEdit" :title="editingAddr ? '编辑地址' : '新增地址'" width="520px">
      <el-form :model="addrForm" label-width="84px">
        <el-form-item label="收货人">
          <el-input v-model="addrForm.receiver" placeholder="收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="addrForm.phone" placeholder="11 位手机号" @input="onPhoneInput(addrForm, 'phone')" />
          <div class="tip" v-if="addrForm.phone && !phoneOk(addrForm.phone)">请输入 11 位有效手机号</div>
        </el-form-item>
        <el-form-item label="所在地区">
          <el-input v-model="addrForm.region" placeholder="如：山东省 济南市 历下区" />
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="addrForm.detail" type="textarea" :rows="2" placeholder="街道、门牌号、楼栋等（不少于 5 字）" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="addrForm.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addrEdit = false">取消</el-button>
        <el-button type="primary" :loading="savingAddr" @click="saveAddr">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { fetchProfile, updateProfile, listAddresses, createAddress, updateAddress, setDefaultAddress, deleteAddress, type AddressItem } from '@/data/api/account';
import type { UserInfo } from '@/data/api/auth';

const loading = ref(true);
const profile = ref<UserInfo | null>(null);
const nickname = computed(() => profile.value?.nickname?.trim() || profile.value?.username || '');
const avatarText = computed(() => (nickname.value || '?').slice(0, 1).toUpperCase());

// ---- 基础资料编辑 ----
const basicEdit = ref(false);
const savingBasic = ref(false);
const draft = reactive<{ nickname: string; phone: string }>({ nickname: '', phone: '' });
function openBasic() {
  draft.nickname = profile.value?.nickname ?? '';
  draft.phone = profile.value?.phone ?? '';
  basicEdit.value = true;
}
async function saveBasic() {
  const payload: { nickname?: string; phone?: string } = {};
  const nick = draft.nickname.trim();
  const ph = draft.phone.trim();
  if (nick !== (profile.value?.nickname ?? '')) payload.nickname = nick;
  if (ph !== (profile.value?.phone ?? '')) payload.phone = ph;
  if (ph && !phoneOk(ph)) { ElMessage.warning('请输入正确的 11 位手机号'); return; }
  if (!Object.keys(payload).length) { basicEdit.value = false; return; }
  savingBasic.value = true;
  try {
    profile.value = await updateProfile(payload);
    ElMessage.success('已保存');
    basicEdit.value = false;
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '保存失败');
  } finally {
    savingBasic.value = false;
  }
}

// ---- 头像 ----
const avatarEdit = ref(false);
const savingAvatar = ref(false);
const avatarDraft = ref('');
async function saveAvatar() {
  const url = avatarDraft.value.trim();
  if (!url) { ElMessage.warning('请输入头像 URL'); return; }
  savingAvatar.value = true;
  try {
    profile.value = await updateProfile({ avatarUrl: url });
    ElMessage.success('头像已更新');
    avatarEdit.value = false;
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '保存失败');
  } finally {
    savingAvatar.value = false;
  }
}

// ---- 地址簿 ----
const addresses = ref<AddressItem[]>([]);
const addrEdit = ref(false);
const savingAddr = ref(false);
const editingAddr = ref<AddressItem | null>(null);
const addrForm = reactive<{ receiver: string; phone: string; region: string; detail: string; isDefault: boolean }>({
  receiver: '', phone: '', region: '', detail: '', isDefault: false,
});

function phoneOk(p: string) {
  return /^1[3-9]\d{9}$/.test(p);
}
function onPhoneInput(form: any, key: string) {
  form[key] = String(form[key] || '').replace(/\D/g, '').slice(0, 11);
}

function resetAddrForm() {
  addrForm.receiver = '';
  addrForm.phone = '';
  addrForm.region = '';
  addrForm.detail = '';
  addrForm.isDefault = false;
}
function openAddr(a?: AddressItem) {
  editingAddr.value = a ?? null;
  resetAddrForm();
  if (a) {
    addrForm.receiver = a.receiver;
    addrForm.phone = a.phone;
    addrForm.region = a.region;
    addrForm.detail = a.detail;
    addrForm.isDefault = !!a.isDefault;
  } else {
    addrForm.isDefault = addresses.value.length === 0;
  }
  addrEdit.value = true;
}
async function saveAddr() {
  const { receiver, phone, region, detail, isDefault } = addrForm;
  if (!receiver.trim()) { ElMessage.warning('请填写收货人'); return; }
  if (!phoneOk(phone)) { ElMessage.warning('请输入正确的 11 位手机号'); return; }
  if (!region.trim()) { ElMessage.warning('请填写所在地区'); return; }
  if (detail.trim().length < 5) { ElMessage.warning('请填写详细地址（不少于 5 字）'); return; }
  savingAddr.value = true;
  try {
    const payload = { receiver: receiver.trim(), phone, region: region.trim(), detail: detail.trim(), isDefault };
    if (editingAddr.value) {
      addresses.value = await updateAddress(editingAddr.value.id, payload);
    } else {
      addresses.value = await createAddress(payload);
    }
    addrEdit.value = false;
    ElMessage.success('已保存');
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '保存失败');
  } finally {
    savingAddr.value = false;
  }
}
async function onSetDefault(a: AddressItem) {
  try {
    addresses.value = await setDefaultAddress(a.id);
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '操作失败');
  }
}
async function onDelete(a: AddressItem) {
  try {
    addresses.value = await deleteAddress(a.id);
    ElMessage.success('已删除');
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '删除失败');
  }
}

onMounted(async () => {
  try {
    profile.value = await fetchProfile();
    addresses.value = await listAddresses();
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.profile-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 16px 40px;
}
.zone {
  background: var(--zi-panel, #fffdf4);
  border: 1px solid #e0d3b0;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 18px;
}
.zone-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.zone-title {
  font-size: 15px;
  font-weight: 600;
  color: #6d2c1c;
  border-left: 3px solid #b4861f;
  padding-left: 8px;
  margin-bottom: 14px;
}
.zone-head .zone-title { margin-bottom: 0; }
.profile-main {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.avatar-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.avatar-big {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #cfa84c;
  background: linear-gradient(135deg, #a03526, #b4861f);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
}
.avatar-big img { width: 100%; height: 100%; object-fit: cover; }
.info-col { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.info-row { display: flex; align-items: center; gap: 12px; font-size: 14px; }
.info-row .k { color: #8d8266; width: 74px; flex: none; }
.info-row .v { color: #3a3125; flex: 1; }
.addr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.addr-card {
  border: 1px solid #e0d3b0;
  border-radius: 6px;
  padding: 12px;
  background: #fffdf6;
}
.addr-card.def { border-color: #cfa84c; box-shadow: 0 0 0 1px #cfa84c55; }
.addr-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.rcv { font-weight: 600; color: #3a3125; }
.addr-phone { font-size: 13px; color: #6c5f47; margin-bottom: 4px; }
.addr-text { font-size: 13px; color: #6c5f47; line-height: 1.6; }
.addr-ops { margin-top: 10px; display: flex; gap: 6px; }
.tip { color: #c0392b; font-size: 12px; line-height: 1.6; }
.avatar-preview {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.avatar-preview img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 2px solid #cfa84c; }
.avatar-preview .ph {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a03526, #b4861f);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
}
</style>
