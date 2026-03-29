// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
const SUPPORTED_LANGS = ["tr", "ar", "en"];
const LANG_STORAGE_KEY = "app_lang";

function getInitialLanguage() {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  return "tr";
}

function applyDocumentLanguage(lng) {
  if (typeof document === "undefined") return;
  const safeLang = SUPPORTED_LANGS.includes(lng) ? lng : "tr";
  document.documentElement.lang = safeLang;
  document.documentElement.dir = safeLang === "ar" ? "rtl" : "ltr";
}
const resources = {
  tr: {
    translation: {
      // ===== Navbar  =====
      "nav.title": "Şikâyetlerim",
      "nav.dashboard": "Yönetim",
      "nav.newComplaint": "Yeni şikâyet",
      "nav.departments": "Birimler",
      "nav.users": "Kullanıcılar",
      "nav.aiSettings": "Yapay zekâ ayarları",
      "nav.logout": "Çıkış",

      "users.title": "Kullanıcı Yönetimi",
      "users.subtitle":
        "Yönetici ve belediye personeli hesaplarını, rollerini ve yetkilerini buradan kontrol edin.",

      common: {
        yes: "Evet",
        no: "Hayır",
        back: "Geri",
        refresh: "Yenile",
        save: "Kaydet",
        create: "Oluştur",
        cancel: "İptal",
        edit: "Düzenle",
        delete: "Sil",
        loading: "Yükleniyor...",
        creating: "Oluşturuluyor...",
      },

      // ===== Users Management =====
      usersManagement: {
        title: "Kullanıcı Yönetimi",
        subtitle:
          "Yönetici ve belediye personeli hesaplarını, rollerini ve yetkilerini buradan kontrol edin.",
        loggedInAs: "Giriş yapan:",
        roleLabel: "Rol:",

        roles: {
          manager: "Yönetici",
          staff: "Personel",
          citizen: "Vatandaş",
        },

        columns: {
          id: "ID",
          username: "Kullanıcı adı",
          role: "Rol",
          isStaff: "Personel",
          nationalId: "Kimlik No",
          isBlocked: "Engelli",
          isSpammer: "Spamcı",
          viewScope: "Görüş kapsamı",
          permissions: "Yetkiler",
          actions: "İşlemler",
        },

        perms: {
          read: "Şikâyetleri görüntüle",
          update: "Şikâyetleri güncelle",
          reply: "Şikâyetlere cevap ver",
          departments: "Birimler",
          users: "Kullanıcılar",
          aiSettings: "Yapay zekâ",
        },

        viewScope: {
          unassigned: "Sadece birimi atanmadıklar",
          assignedNoDeps: "Seçili birimler (tanımlı değil)",
          assignedWithDeps: "Seçili birimler: {{deps}}",
          all: "Tüm şikâyetler",
        },

        viewScopeOption: {
          all: "Tüm şikâyetleri görebilsin",
          assigned: "Sadece seçili birimlerin şikâyetlerini görebilsin",
          unassigned: "Sadece birimi atanmamış şikâyetler",
        },

        fields: {
          username: "Kullanıcı adı",
          role: "Rol",
          password: "Şifre",
          passwordAgain: "Şifre (tekrar)",
          nationalId11: "Kimlik numarası (11 hane)",
          nationalIdOptional: "Kimlik numarası (opsiyonel)",
          isStaff: "Personel durumu",
          canAccessAdmin: "Bu kullanıcı yönetim paneline erişebilsin",
          viewScopeTitle: "Şikâyet görüntüleme kapsamı (personel)",
          viewableDepartments: "Görüntüleyebileceği birimler",
          permissionsTitle: "Yetkiler (personel / yönetici için)",
          newPasswordOptional: "Yeni şifre (opsiyonel)",
          newPasswordAgain: "Yeni şifre (tekrar)",
          isBlocked: "Engelli",
          blockLogin: "Bu kullanıcının girişini engelle",
          isSpammer: "Spamcı",
          spammerLabel: "Aşırı şikâyet / spam",
        },

        placeholders: {
          username: "kullanıcı adı",
          password: "şifre",
          passwordAgain: "şifre tekrar",
          nationalIdCitizenOnly: "Sadece vatandaş için zorunlu",
          newPasswordOptional: "Boş bırakırsanız değiştirilmez",
          newPasswordAgain: "Tekrar",
          nationalIdOptional: "11 haneli kimlik no",
        },

        filters: {
          searchPlaceholder: "Kullanıcı adı veya kimlik no ara...",
          roles: {
            all: "Tüm roller",
          },
          staff: {
            all: "Tümü (personel / değil)",
            onlyStaff: "Sadece is_staff = Evet",
            onlyNonStaff: "Sadece is_staff = Hayır",
          },
          blocked: {
            all: "Engel durumu: hepsi",
            onlyBlocked: "Sadece engelli",
            onlyNotBlocked: "Engelli olmayanlar",
          },
        },

        newUserTitle: "Yeni kullanıcı oluştur",
        editUserTitle: "Kullanıcı düzenle #{{id}} ({{username}})",
        noUsersForFilter: "Filtrelere uyan kullanıcı bulunamadı.",

        errors: {
          meLoad: "Kullanıcı bilgileri alınamadı.",
          noAccess: "Bu sayfaya erişim yetkiniz yok.",
          usersLoad: "Kullanıcılar yüklenemedi.",
          userCreateFail: "Kullanıcı oluşturulamadı.",
          userUpdateFail: "Kullanıcı güncellenemedi.",
          passwordsDontMatch: "Şifreler eşleşmiyor.",
          passwordTooShort: "Şifre en az 6 karakter olmalıdır.",
          nationalIdCitizen11Digits:
            "Vatandaş için kimlik numarası 11 haneli olmalıdır.",
          create: {
            fillUsernameAndPassword:
              "Lütfen kullanıcı adı ve şifre alanlarını doldurun.",
          },
          newPasswordFillBoth:
            "Lütfen yeni şifrenin her iki alanını da doldurun.",
          newPasswordsDontMatch: "Yeni şifreler eşleşmiyor.",
          newPasswordTooShort: "Yeni şifre en az 6 karakter olmalıdır.",
          nationalId11IfPresent:
            "Kimlik numarası girildiyse 11 haneli olmalıdır.",
        },

        success: {
          userCreated: "Kullanıcı başarıyla oluşturuldu.",
          userUpdated: "Kullanıcı başarıyla güncellendi.",
        },
      },

      // ===== System Settings =====
      systemSettings: {
        title: "Yapay zekâ & sistem ayarları",
        loading: "Yükleniyor...",
        subtitle:
          "Şikâyetlerin yönlendirilmesi, özetlenmesi ve spam filtreleme eşiğini buradan ayarlayın.",
        back: "Geri",
        saveSuccess: "Ayarlar başarıyla kaydedildi.",
        errors: {
          onlyAdmins: "Bu sayfaya sadece yöneticiler erişebilir.",
          loadFailed: "Ayarlar yüklenemedi.",
          saveFailed: "Ayarlar kaydedilemedi.",
        },
        sections: {
          aiFeatures: {
            title: "Yapay zekâ özellikleri",
            help: "Şikâyet metinlerine göre özet çıkarma ve otomatik birim yönlendirmeyi isteğe göre açıp kapatabilirsiniz.",
          },
          thresholds: {
            title: "Eşik değerleri",
            help: "Yapay zekânın kararı ne kadar güçlü olduğunda dikkate alınacağını belirleyin.",
          },
          spamRules: {
            title: "Spam kuralları",
            help: "Aynı kullanıcının kısa sürede çok sayıda şikâyet göndermesini sınırlandırın.",
          },
          citizenAccounts: {
            title: "Vatandaş hesapları",
            help: "Vatandaşların kendilerinin kayıt oluşturup oluşturamayacağını belirleyin.",
          },
        },
        fields: {
          use_ai_summary: "AI özetleme özelliğini kullan",
          use_ai_routing: "Şikâyetleri otomatik olarak ilgili birime yönlendir",
          use_duplicate_detection: "Benzer şikâyetleri (duplicate) tespit et",
          ai_min_confidence: {
            label: "AI güven eşiği (0–1)",
            hint: "Örn. 0.6 → güven %60 altında ise AI birim önerisi kullanılmasın.",
          },
          similarity_threshold: {
            label: "Duplicate benzerlik eşiği (0–1)",
            hint: "Örn. 0.8 → benzerlik %80 üzerindeyse mükerrer kabul edilir.",
          },
          spam_max_per_day: {
            label: "Günlük maksimum şikâyet",
            hint: "Bu sınır aşıldığında kullanıcı geçici olarak spam sayılır.",
          },
          spam_max_per_hour: {
            label: "Saatlik maksimum şikâyet",
            hint: "Çok yoğun arka arkaya şikâyetleri engellemek için.",
          },
          allow_citizen_registration:
            "Vatandaşların sistem üzerinden kayıt olmasına izin ver",
        },
        buttons: {
          save: "Ayarları kaydet",
          saving: "Kaydediliyor...",
        },
      },
      register: {
        heroKicker: "Akıllı Belediye",
        heroTitle: {
          main: "Vatandaş",
          highlight: "Kaydı",
        },
        heroText:
          "Türk vatandaşları için çevrim içi şikâyet başvurusu. Lütfen geçerli bir kullanıcı adı ve 11 haneli TC kimlik numarası girin.",

        fields: {
          username: "Kullanıcı adı",
          nationalId: "TC kimlik numarası",
          password: "Şifre",
          passwordAgain: "Şifre (tekrar)",
        },

        placeholders: {
          username: "Kullanıcı adınızı girin",
          nationalId: "11 haneli kimlik numarası",
          password: "Şifre belirleyin",
          passwordAgain: "Şifreyi tekrar yazın",
        },

        buttons: {
          submitting: "Kayıt yapılıyor...",
          submit: "Kayıt ol",
          login: "Giriş yap",
        },

        meta: {
          haveAccountQuestion: "Zaten hesabınız var mı?",
        },

        errors: {
          fillAllFields: "Lütfen tüm alanları doldurun.",
          passwordsDontMatch: "Şifreler eşleşmiyor.",
          nationalId11Digits: "TC kimlik numarası 11 haneli olmalıdır.",
          genericFail: "Kayıt başarısız. Lütfen tekrar deneyin.",
        },

        success: {
          registered: "Kayıt başarılı. Şimdi giriş yapabilirsiniz.",
        },
      },
      complaints: {
        status: {
          submitted: "Gönderildi",
          new: "Yeni",
          inReview: "İncelemede",
          closed: "Kapandı",
        },
      },

      newComplaint: {
        loggedInAs: "Giriş yapan:",
        roleLabel: "Rol:",
        form: {
          title: "Şikâyet formu",
          help: "Lütfen problemi mümkün olduğunca açık bir şekilde Türkçe veya Arapça olarak yazınız.",
        },
        fields: {
          text: "Şikâyet metni",
          department: "Birim seçimi",
        },
        placeholders: {
          text: "Örnek: Mahallemizdeki sokak lambaları çalışmıyor, akşamları çok karanlık oluyor...",
        },
        hints: {
          noAbuse:
            "Hakaret içeren mesajlar, küfür veya kişisel bilgiler paylaşmayınız.",
          departmentWithAi:
            "İsterseniz birim seçmeden bırakabilirsiniz, sistem en uygun kuruma yönlendirmeye çalışır.",
          departmentWithoutAi:
            "Yapay zekâ yönlendirmesi kapalı olduğu için birim seçmek zorunludur.",
        },
        department: {
          auto: "— Otomatik (yapay zekâ yönlendirsin) —",
          choose: "— Birim seçin —",
        },
        buttons: {
          submit: "Şikâyeti gönder",
          submitting: "Gönderiliyor...",
        },
        errors: {
          emptyText: "Lütfen şikâyet metnini yazın.",
          departmentRequiredWhenAiOff:
            "Yapay zekâ kapalıyken birim seçmek zorunludur.",
          genericFail: "Şikâyet oluşturulurken bir hata oluştu.",
        },
        success: {
          created: "Şikâyetiniz başarıyla kaydedildi.",
        },
        side: {
          title: "Sistem hakkında",
          items: {
            trackStatus:
              "Şikâyetiniz sisteme kaydedildikten sonra durumunu {{page}} sayfasından takip edebilirsiniz.",
            statusFlow: "Durumlar: {{new}} → {{inReview}} → {{closed}}.",
            adminCanRoute:
              "Yönetici, şikâyetinizi ilgili birime yönlendirebilir ve gerekirse sizinle iletişime geçebilir.",
            aiDuplicates:
              "Yapay zekâ açıksa benzer şikâyetler tespit edilip mükerrer olarak işaretlenebilir.",
          },
        },
      },
      login: {
        brand: {
          kicker: "Akıllı Belediye",
          titleMain: "Akıllı Şikâyet",
          titleHighlight: "Sistemi",
          subtitle:
            "Yapay zekâ destekli yönlendirme, Türkçe özetler ve yöneticiler, personel ve vatandaşlar için net bir kontrol paneli.",
        },
        pills: {
          aiRouting: "Yapay zekâ yönlendirme",
          duplicateDetection: "Tekrarlanan şikâyet tespiti",
          spamProtection: "Spam koruması",
        },
        form: {
          title: "Giriş yap",
          caption: "Yönetici, personel veya vatandaş hesabınızla giriş yapın.",
        },
        fields: {
          username: "Kullanıcı adı",
          password: "Şifre",
        },
        placeholders: {
          username: "Kullanıcı adınızı girin",
          password: "Şifrenizi girin",
        },
        buttons: {
          login: "Giriş yap",
          loggingIn: "Giriş yapılıyor...",
        },
        registerPrompt: {
          text: "Henüz hesabınız yok mu?",
          button: "Vatandaş olarak kayıt ol",
        },
        info: {
          managedAccounts:
            "Vatandaş hesapları belediye sistemi tarafından yönetilir.",
        },
        errors: {
          invalidCreds: "Kullanıcı adı veya şifre hatalı.",
          generic: "Giriş başarısız. Lütfen tekrar deneyin.",
        },
      },
      departments: {
        title: "Birimler",
        subtitle:
          "Belediyede kullanılan hizmet birimlerini ekleyin, güncelleyin ve kaldırın.",
        loggedInAs: "Giriş yapan:",
        roleLabel: "Rol:",
        role: {
          staffOrManager: "Yönetici / Personel",
        },
        errors: {
          meLoad: "Kullanıcı bilgileri alınamadı.",
          noAccess: "Bu sayfa için yetkiniz yok.",
          noAccessAlert:
            "Bu sayfa yalnızca yönetici ve belediye personeli içindir.",
          loadFailed: "Birimler yüklenemedi.",
          validationNameCodeRequired: "Türkçe ad ve kod zorunludur.",
          saveFailedWithDetails: "Kaydetme hatası: {{details}}",
          saveFailed: "Birim kaydedilemedi.",
          deleteFailed: "Birim silinemedi.",
        },
        success: {
          created: "Yeni birim oluşturuldu.",
          updated: "Birim başarıyla güncellendi.",
          deleted: "Birim silindi.",
        },
        confirm: {
          delete: '"{{name}}" birimini silmek istiyor musunuz?',
        },
        form: {
          titleNew: "Yeni birim ekle",
          titleEdit: "Birim düzenle (#{{id}})",
        },
        fields: {
          name_tr: "Türkçe ad",
          code: "Kod",
          name_ar_optional: "Arapça ad (isteğe bağlı)",
        },
        placeholders: {
          name_tr: "Örn. Belediye",
          code: "Örn. MUNIC, HEALTH",
          name_ar: "مثال: البلدية",
        },
        search: {
          placeholder: "Ada, koda veya Arapça ada göre ara...",
        },
        empty: "Henüz birim tanımlanmamış.",
        table: {
          columns: {
            id: "ID",
            name_tr: "Türkçe ad",
            code: "Kod",
            name_ar: "Arapça ad",
            actions: "İşlemler",
          },
          noData: "Gösterilecek birim bulunamadı.",
        },
      },
      dashboard: {
        title: {
          staff: "Yönetim Paneli",
          citizen: "Şikâyetlerim",
        },
        header: {
          loggedInAs: "Giriş yapan:",
          role: "Rol:",
        },
        errors: {
          loadFailed: "Şikâyetler yüklenemedi.",
        },
        status: {
          submitted: "Gönderildi",
          new: "Yeni",
          in_review: "İncelemede",
          closed: "Kapandı",
        },
        source: {
          duplicate: "Mükerrer #{{index}}",
          ai: "Yapay zekâ",
          manual: "Manuel",
        },
        department: {
          pendingReview: "İnceleniyor",
        },
        stats: {
          total: {
            staffLabel: "Toplam şikâyet",
            citizenLabel: "Toplam şikâyetim",
            staffHint: "Sistemde kayıtlı tüm şikâyet sayısı.",
            citizenHint: "Bu hesapla oluşturduğunuz şikâyet sayısı.",
          },
          waiting: {
            label: "Bekleyen şikâyet",
            hint: 'Durumu "Yeni" veya "İncelemede" olan şikâyetler.',
          },
          aiUsed: {
            label: "Yapay zekâ kullanılan",
            hint: "Otomatik özetleme / yönlendirme yapılan şikâyetler.",
          },
          duplicates: {
            label: "Mükerrer şikâyetler",
            hint: "Benzer içerikten üretilmiş tekrar şikâyet kayıtları.",
          },
        },
        table: {
          searchPlaceholder: "Metne, vatandaşa veya birime göre ara...",
          noData: "Gösterilecek şikâyet bulunamadı.",
          columns: {
            id: "ID",
            citizen: "Vatandaş",
            date: "Tarih",
            status: "Durum",
            department: "Birim",
            source: "Kaynak",
            confidence: "Güven",
            complaint: "Şikâyet",
            actions: "İşlemler",
          },
          actions: {
            details: "Detay",
          },
        },
      },
      complaintDetail: {
        title: {
          staff: "Şikâyet Detayı",
          citizen: "Şikâyetim",
        },
        loading: "Yükleniyor...",
        errors: {
          notFound: "Şikâyet bulunamadı.",
          loadFailed: "Şikâyet detayı yüklenemedi.",
        },
        header: {
          idLabel: "ID:",
          dateMissing: "Tarih yok",
          citizenLabel: "Vatandaş:",
        },
        cards: {
          status: {
            label: "Durum",
            hint: "Şikâyetin işlenme durumu (Yeni / İncelemede / Kapandı).",
            createdAt: "Oluşturuldu:",
            inReviewAt: "İncelemeye alındı:",
            closedAt: "Kapatılma tarihi:",
          },
          department: {
            label: "Birim",
            unassigned: "Atanmamış",
            hint: "Şikâyetin yönlendirildiği belediye birimi / kurum.",
          },
          source: {
            label: "Kaynak",
            hint: "Mükerrer / yapay zekâ / manuel sınıflandırma bilgisi.",
          },
          confidence: {
            label: "Model güveni",
            hint: "Yapay zekâ modelinin ilgili birime yönlendirme güven oranı.",
          },
        },
        readOnly: {
          title: "Şikâyet metni",
        },
        edit: {
          title: "Şikâyeti düzenle",
          fields: {
            status: "Durum",
            department: "Birim",
            text: "Şikâyet metni",
            summary: "Özet (yapay zekâ)",
            summaryPlaceholder:
              "Gerekirse özeti manuel olarak düzeltebilirsiniz.",
          },
          buttons: {
            saving: "Kaydediliyor...",
            save: "Kaydet",
            cancel: "İptal",
          },
        },
        messages: {
          updateSuccess: "Şikâyet güncellendi.",
          updateError: "Güncelleme başarısız. Lütfen tekrar deneyin.",
        },
      },
    },
  },

  // ================== ARABIC ==================
  ar: {
    translation: {
      "nav.title": "شكاويّ",
      "nav.dashboard": "لوحة التحكم",
      "nav.newComplaint": "شكوى جديدة",
      "nav.departments": "الوحدات",
      "nav.users": "المستخدمون",
      "nav.aiSettings": "إعدادات الذكاء الاصطناعي",
      "nav.logout": "تسجيل الخروج",

      "users.title": "إدارة المستخدمين",
      "users.subtitle":
        "تحكم بحسابات الموظفين والمديرين وصلاحياتهم من هذه الصفحة.",

      common: {
        yes: "نعم",
        no: "لا",
        back: "رجوع",
        refresh: "تحديث",
        save: "حفظ",
        create: "إنشاء",
        cancel: "إلغاء",
        edit: "تعديل",
        delete: "حذف",
        loading: "جارٍ التحميل...",
        creating: "جارٍ الإنشاء...",
      },

      usersManagement: {
        title: "إدارة المستخدمين",
        subtitle: "تحكم بحسابات الموظفين والمديرين وصلاحياتهم من هذه الصفحة.",
        loggedInAs: "المستخدم الحالي:",
        roleLabel: "الدور:",

        roles: {
          manager: "مدير",
          staff: "موظف",
          citizen: "مواطن",
        },

        columns: {
          id: "المعرّف",
          username: "اسم المستخدم",
          role: "الدور",
          isStaff: "موظف",
          nationalId: "الرقم الوطني",
          isBlocked: "محظور",
          isSpammer: "مزعج (سبام)",
          viewScope: "نطاق العرض",
          permissions: "الصلاحيات",
          actions: "إجراءات",
        },

        perms: {
          read: "عرض الشكاوى",
          update: "تحديث الشكاوى",
          reply: "الرد على الشكاوى",
          departments: "الوحدات",
          users: "المستخدمون",
          aiSettings: "الذكاء الاصطناعي",
        },

        viewScope: {
          unassigned: "فقط الشكاوى غير المعيّنة لأي جهة",
          assignedNoDeps: "جهات محددة (غير معرّفة)",
          assignedWithDeps: "الجهات المحددة: {{deps}}",
          all: "جميع الشكاوى",
        },

        viewScopeOption: {
          all: "يمكنه رؤية جميع الشكاوى",
          assigned: "يمكنه رؤية شكاوى الجهات المحددة فقط",
          unassigned: "يمكنه رؤية الشكاوى غير المعيّنة فقط",
        },

        fields: {
          username: "اسم المستخدم",
          role: "الدور",
          password: "كلمة المرور",
          passwordAgain: "تأكيد كلمة المرور",
          nationalId11: "الرقم الوطني (11 خانة)",
          nationalIdOptional: "الرقم الوطني (اختياري)",
          isStaff: "حالة الموظف",
          canAccessAdmin: "يمكنه الدخول إلى لوحة الإدارة",
          viewScopeTitle: "نطاق عرض الشكاوى (للموظفين)",
          viewableDepartments: "الوحدات التي يمكن عرض شكاواها",
          permissionsTitle: "الصلاحيات (للموظفين/المديرين)",
          newPasswordOptional: "كلمة مرور جديدة (اختياري)",
          newPasswordAgain: "تأكيد كلمة المرور الجديدة",
          isBlocked: "محظور",
          blockLogin: "منع هذا المستخدم من تسجيل الدخول",
          isSpammer: "مستخدم مزعج",
          spammerLabel: "كثرة الشكاوى / سبام",
        },

        placeholders: {
          username: "اسم المستخدم",
          password: "كلمة المرور",
          passwordAgain: "تأكيد كلمة المرور",
          nationalIdCitizenOnly: "إلزامي للمواطنين فقط",
          newPasswordOptional: "اتركه فارغًا لعدم التغيير",
          newPasswordAgain: "أعد إدخال كلمة المرور",
          nationalIdOptional: "رقم وطني مكوّن من 11 خانة",
        },

        filters: {
          searchPlaceholder: "ابحث باسم المستخدم أو الرقم الوطني...",
          roles: {
            all: "كل الأدوار",
          },
          staff: {
            all: "الجميع (موظف / غير موظف)",
            onlyStaff: "فقط is_staff = نعم",
            onlyNonStaff: "فقط is_staff = لا",
          },
          blocked: {
            all: "حالة الحظر: الجميع",
            onlyBlocked: "المحظورون فقط",
            onlyNotBlocked: "غير المحظورين فقط",
          },
        },

        newUserTitle: "إنشاء مستخدم جديد",
        editUserTitle: "تعديل المستخدم #{{id}} ({{username}})",
        noUsersForFilter: "لا يوجد مستخدمون يطابقون عوامل التصفية.",

        errors: {
          meLoad: "تعذّر جلب بيانات المستخدم.",
          noAccess: "ليست لديك صلاحية للوصول إلى هذه الصفحة.",
          usersLoad: "تعذّر تحميل قائمة المستخدمين.",
          userCreateFail: "تعذّر إنشاء المستخدم.",
          userUpdateFail: "تعذّر تحديث بيانات المستخدم.",
          passwordsDontMatch: "كلمتا المرور غير متطابقتين.",
          passwordTooShort: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
          nationalIdCitizen11Digits:
            "يجب أن يتكون الرقم الوطني من 11 خانة للمواطن.",
          create: {
            fillUsernameAndPassword: "يرجى تعبئة اسم المستخدم وكلمة المرور.",
          },
          newPasswordFillBoth: "يرجى تعبئة حقلي كلمة المرور الجديدة.",
          newPasswordsDontMatch: "كلمتا المرور الجديدتان غير متطابقتين.",
          newPasswordTooShort:
            "يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.",
          nationalId11IfPresent:
            "إذا تم إدخال الرقم الوطني فيجب أن يكون من 11 خانة.",
        },

        success: {
          userCreated: "تم إنشاء المستخدم بنجاح.",
          userUpdated: "تم تحديث بيانات المستخدم بنجاح.",
        },
      },

      systemSettings: {
        title: "إعدادات الذكاء الاصطناعي والنظام",
        loading: "جارٍ التحميل...",
        subtitle:
          "قم بضبط توجيه الشكاوى، تلخيصها، وحدود تصفية الرسائل المزعجة من هنا.",
        back: "رجوع",
        saveSuccess: "تم حفظ الإعدادات بنجاح.",
        errors: {
          onlyAdmins: "هذه الصفحة متاحة للمسؤولين فقط.",
          loadFailed: "تعذّر تحميل الإعدادات.",
          saveFailed: "تعذّر حفظ الإعدادات.",
        },
        sections: {
          aiFeatures: {
            title: "ميزات الذكاء الاصطناعي",
            help: "يمكنك تفعيل أو إيقاف تلخيص الشكاوى والتوجيه التلقائي إلى الجهة المناسبة.",
          },
          thresholds: {
            title: "قيم العتبة",
            help: "حدّد مدى قوة قرار الذكاء الاصطناعي حتى يتم اعتماده.",
          },
          spamRules: {
            title: "قواعد الرسائل المزعجة",
            help: "حدّد عدد الشكاوى المسموح بها في فترة زمنية لتجنب الإساءة.",
          },
          citizenAccounts: {
            title: "حسابات المواطنين",
            help: "حدّد ما إذا كان يمكن للمواطنين إنشاء حساب بأنفسهم أم لا.",
          },
        },
        fields: {
          use_ai_summary: "استخدام ميزة تلخيص الشكاوى بالذكاء الاصطناعي",
          use_ai_routing: "توجيه الشكاوى تلقائيًا إلى الجهة المناسبة",
          use_duplicate_detection: "كشف الشكاوى المتشابهة (المكررة)",
          ai_min_confidence: {
            label: "حد ثقة الذكاء الاصطناعي (0–1)",
            hint: "مثال: 0.6 → إذا كانت الثقة أقل من 60٪ فلن تُستخدم توصية الجهة.",
          },
          similarity_threshold: {
            label: "حد تشابه الشكاوى المكررة (0–1)",
            hint: "مثال: 0.8 → إذا كان التشابه فوق 80٪ تُعتبر الشكوى مكررة.",
          },
          spam_max_per_day: {
            label: "الحد الأقصى اليومي للشكاوى",
            hint: "إذا تم تجاوز هذا الحد يُعتبر المستخدم مزعجًا مؤقتًا.",
          },
          spam_max_per_hour: {
            label: "الحد الأقصى لكل ساعة",
            hint: "للحد من إرسال عدد كبير من الشكاوى المتتالية في وقت قصير.",
          },
          allow_citizen_registration:
            "السماح للمواطنين بالتسجيل في النظام بأنفسهم",
        },
        buttons: {
          save: "حفظ الإعدادات",
          saving: "جارٍ الحفظ...",
        },
      },
      register: {
        heroKicker: "البلدية الذكية",
        heroTitle: {
          main: "تسجيل",
          highlight: "المواطن",
        },
        heroText:
          "نظام تقديم الشكاوى عبر الإنترنت للمواطنين الأتراك. يُرجى إدخال اسم مستخدم صالح ورقم وطني مؤلف من 11 خانة.",

        fields: {
          username: "اسم المستخدم",
          nationalId: "الرقم الوطني التركي",
          password: "كلمة المرور",
          passwordAgain: "تأكيد كلمة المرور",
        },

        placeholders: {
          username: "أدخل اسم المستخدم",
          nationalId: "رقم وطني مكوّن من 11 خانة",
          password: "اختر كلمة مرور",
          passwordAgain: "أعد كتابة كلمة المرور",
        },

        buttons: {
          submitting: "جارٍ إنشاء الحساب...",
          submit: "إنشاء حساب",
          login: "تسجيل الدخول",
        },

        meta: {
          haveAccountQuestion: "لديك حساب مسبقًا؟",
        },

        errors: {
          fillAllFields: "يرجى تعبئة جميع الحقول.",
          passwordsDontMatch: "كلمتا المرور غير متطابقتين.",
          nationalId11Digits: "يجب أن يتكوّن الرقم الوطني من 11 خانة.",
          genericFail: "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.",
        },

        success: {
          registered: "تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.",
        },
      },
      complaints: {
        status: {
          submitted: "تم الإرسال",
          new: "جديدة",
          inReview: "قيد المراجعة",
          closed: "مغلقة",
        },
      },

      newComplaint: {
        loggedInAs: "المستخدم المسجَّل:",
        roleLabel: "الدور:",
        form: {
          title: "نموذج الشكوى",
          help: "يرجى كتابة المشكلة بوضوح قدر الإمكان باللغة التركية أو العربية.",
        },
        fields: {
          text: "نص الشكوى",
          department: "اختيار الجهة",
        },
        placeholders: {
          text: "مثال: أعمدة الإنارة في حيّنا لا تعمل، فيصبح الشارع مظلماً جداً في المساء...",
        },
        hints: {
          noAbuse:
            "يرجى عدم استخدام الألفاظ المسيئة أو الشتائم أو مشاركة البيانات الشخصية.",
          departmentWithAi:
            "يمكنك ترك حقل الجهة فارغًا، وسيحاول النظام توجيه الشكوى تلقائيًا إلى الجهة الأنسب.",
          departmentWithoutAi:
            "بما أن توجيه الذكاء الاصطناعي متوقف، فإن اختيار الجهة أصبح إلزاميًا.",
        },
        department: {
          auto: "— تلقائي (يتم التوجيه عبر الذكاء الاصطناعي) —",
          choose: "— اختر الجهة —",
        },
        buttons: {
          submit: "إرسال الشكوى",
          submitting: "جارٍ إرسال الشكوى...",
        },
        errors: {
          emptyText: "يرجى كتابة نص الشكوى.",
          departmentRequiredWhenAiOff:
            "عند إيقاف الذكاء الاصطناعي يصبح اختيار الجهة إلزاميًا.",
          genericFail: "حدث خطأ أثناء إنشاء الشكوى.",
        },
        success: {
          created: "تم تسجيل شكواك بنجاح.",
        },
        side: {
          title: "حول النظام",
          items: {
            trackStatus:
              "بعد تسجيل الشكوى في النظام يمكنك متابعة حالتها من صفحة {{page}}.",
            statusFlow: "حالات الشكوى: {{new}} ← {{inReview}} ← {{closed}}.",
            adminCanRoute:
              "يمكن للمسؤول تحويل شكواك إلى الجهة المختصة والتواصل معك عند الحاجة.",
            aiDuplicates:
              "إذا كان الذكاء الاصطناعي مفعّلًا فسيتم اكتشاف الشكاوى المتشابهة ووضعها كنسخ مكررة.",
          },
        },
      },
      login: {
        brand: {
          kicker: "البلدية الذكية",
          titleMain: "نظام الشكاوى",
          titleHighlight: "الذكي",
          subtitle:
            "توجيه مدعوم بالذكاء الاصطناعي، وملخصات باللغة التركية، ولوحة تحكم واضحة للمديرين والموظفين والمواطنين.",
        },
        pills: {
          aiRouting: "توجيه بالذكاء الاصطناعي",
          duplicateDetection: "اكتشاف الشكاوى المكررة",
          spamProtection: "حماية من الرسائل المزعجة",
        },
        form: {
          title: "تسجيل الدخول",
          caption: "سجّل الدخول بحساب المدير أو الموظف أو المواطن.",
        },
        fields: {
          username: "اسم المستخدم",
          password: "كلمة المرور",
        },
        placeholders: {
          username: "أدخل اسم المستخدم",
          password: "أدخل كلمة المرور",
        },
        buttons: {
          login: "تسجيل الدخول",
          loggingIn: "جارٍ تسجيل الدخول...",
        },
        registerPrompt: {
          text: "ليس لديك حساب بعد؟",
          button: "سجّل كمواطن",
        },
        info: {
          managedAccounts: "يتم إدارة حسابات المواطنين من قِبل نظام البلدية.",
        },
        errors: {
          invalidCreds: "اسم المستخدم أو كلمة المرور غير صحيحة.",
          generic: "فشل تسجيل الدخول، يرجى المحاولة مرة أخرى.",
        },
      },
      departments: {
        title: "الوحدات",
        subtitle: "أضِف، عدّل واحذف الوحدات الخدمية المستخدمة في البلدية.",
        loggedInAs: "المستخدم المسجَّل:",
        roleLabel: "الدور:",
        role: {
          staffOrManager: "مدير / موظف",
        },
        errors: {
          meLoad: "تعذّر جلب معلومات المستخدم.",
          noAccess: "ليست لديك صلاحية الوصول إلى هذه الصفحة.",
          noAccessAlert: "هذه الصفحة مخصّصة فقط للمديرين وموظفي البلدية.",
          loadFailed: "تعذّر تحميل الوحدات.",
          validationNameCodeRequired: "الاسم بالتركية والرمز حقول إلزامية.",
          saveFailedWithDetails: "خطأ في الحفظ: {{details}}",
          saveFailed: "تعذّر حفظ الوحدة.",
          deleteFailed: "تعذّر حذف الوحدة.",
        },
        success: {
          created: "تم إنشاء وحدة جديدة.",
          updated: "تم تحديث الوحدة بنجاح.",
          deleted: "تم حذف الوحدة.",
        },
        confirm: {
          delete: 'هل تريد فعلاً حذف الوحدة "{{name}}"؟',
        },
        form: {
          titleNew: "إضافة وحدة جديدة",
          titleEdit: "تعديل وحدة (#{{id}})",
        },
        fields: {
          name_tr: "الاسم بالتركية",
          code: "الرمز",
          name_ar_optional: "الاسم بالعربية (اختياري)",
        },
        placeholders: {
          name_tr: "مثال: البلدية",
          code: "مثال: MUNIC, HEALTH",
          name_ar: "مثال: البلدية",
        },
        search: {
          placeholder: "ابحث بالاسم، الرمز أو الاسم العربي...",
        },
        empty: "لم يتم تعريف أي وحدة بعد.",
        table: {
          columns: {
            id: "المعرف",
            name_tr: "الاسم بالتركية",
            code: "الرمز",
            name_ar: "الاسم بالعربية",
            actions: "الإجراءات",
          },
          noData: "لا توجد وحدات للعرض.",
        },
      },
      dashboard: {
        title: {
          staff: "لوحة الإدارة",
          citizen: "شكاويّ",
        },
        header: {
          loggedInAs: "المستخدم المسجَّل:",
          role: "الدور:",
        },
        errors: {
          loadFailed: "تعذّر تحميل الشكاوى.",
        },
        status: {
          submitted: "تم الإرسال",
          new: "جديدة",
          in_review: "قيد المراجعة",
          closed: "مغلقة",
        },
        source: {
          duplicate: "مكرّرة #{{index}}",
          ai: "ذكاء اصطناعي",
          manual: "يدوي",
        },
        department: {
          pendingReview: "يتم المراجعة",
        },
        stats: {
          total: {
            staffLabel: "إجمالي الشكاوى",
            citizenLabel: "إجمالي شكاويّ",
            staffHint: "إجمالي عدد الشكاوى المسجَّلة في النظام.",
            citizenHint: "عدد الشكاوى التي قدّمتها بهذا الحساب.",
          },
          waiting: {
            label: "شكاوى قيد الانتظار",
            hint: "الشكاوى التي حالتها «جديدة» أو «قيد المراجعة».",
          },
          aiUsed: {
            label: "شكاوى استخدم فيها الذكاء الاصطناعي",
            hint: "شكاوى تم تلخيصها أو توجيهها تلقائياً.",
          },
          duplicates: {
            label: "الشكاوى المكرّرة",
            hint: "سجلات شكاوى تم إنشاؤها من محتوى متشابه.",
          },
        },
        table: {
          searchPlaceholder: "ابحث في النص، اسم المواطن أو اسم الوحدة...",
          noData: "لا توجد شكاوى للعرض.",
          columns: {
            id: "المعرّف",
            citizen: "المواطن",
            date: "التاريخ",
            status: "الحالة",
            department: "الوحدة",
            source: "المصدر",
            confidence: "درجة الثقة",
            complaint: "الشكوى",
            actions: "الإجراءات",
          },
          actions: {
            details: "التفاصيل",
          },
        },
      },
      complaintDetail: {
        title: {
          staff: "تفاصيل الشكوى",
          citizen: "شكواي",
        },
        loading: "جارٍ التحميل...",
        errors: {
          notFound: "لم يتم العثور على الشكوى.",
          loadFailed: "تعذّر تحميل تفاصيل الشكوى.",
        },
        header: {
          idLabel: "المعرّف:",
          dateMissing: "لا يوجد تاريخ",
          citizenLabel: "المواطن:",
        },
        cards: {
          status: {
            label: "الحالة",
            hint: "حالة معالجة الشكوى (جديدة / قيد المراجعة / مغلقة).",
            createdAt: "تاريخ الإنشاء:",
            inReviewAt: "تاريخ بدء المراجعة:",
            closedAt: "تاريخ الإغلاق:",
          },
          department: {
            label: "الوحدة",
            unassigned: "غير مُسنَدة",
            hint: "الوحدة أو الجهة التي وُجّهت إليها الشكوى.",
          },
          source: {
            label: "المصدر",
            hint: "معلومة ما إذا كانت الشكوى مكرّرة، أو مصنَّفة آلياً، أو يدوياً.",
          },
          confidence: {
            label: "ثقة النموذج",
            hint: "نسبة ثقة نموذج الذكاء الاصطناعي في توجيه الشكوى إلى الجهة المناسبة.",
          },
        },
        readOnly: {
          title: "نص الشكوى",
        },
        edit: {
          title: "تعديل الشكوى",
          fields: {
            status: "الحالة",
            department: "الوحدة",
            text: "نص الشكوى",
            summary: "الملخّص (ذكاء اصطناعي)",
            summaryPlaceholder: "يمكنك تعديل الملخّص يدوياً عند الحاجة.",
          },
          buttons: {
            saving: "جارٍ الحفظ...",
            save: "حفظ",
            cancel: "إلغاء",
          },
        },
        messages: {
          updateSuccess: "تمّ تحديث الشكوى بنجاح.",
          updateError: "فشل التحديث، يرجى المحاولة مرة أخرى.",
        },
      },
    },
  },

  // ================== ENGLISH ==================
  en: {
    translation: {
      "nav.title": "My Complaints",
      "nav.dashboard": "Dashboard",
      "nav.newComplaint": "New complaint",
      "nav.departments": "Departments",
      "nav.users": "Users",
      "nav.aiSettings": "AI settings",
      "nav.logout": "Logout",

      "users.title": "Users Management",
      "users.subtitle":
        "Manage staff and admin accounts, roles and permissions here.",

      common: {
        yes: "Yes",
        no: "No",
        back: "Back",
        refresh: "Refresh",
        save: "Save",
        create: "Create",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        loading: "Loading...",
        creating: "Creating...",
      },

      usersManagement: {
        title: "Users Management",
        subtitle:
          "Manage staff and admin accounts, roles and permissions here.",
        loggedInAs: "Logged in as:",
        roleLabel: "Role:",

        roles: {
          manager: "Manager",
          staff: "Staff",
          citizen: "Citizen",
        },

        columns: {
          id: "ID",
          username: "Username",
          role: "Role",
          isStaff: "Staff",
          nationalId: "National ID",
          isBlocked: "Blocked",
          isSpammer: "Spammer",
          viewScope: "View scope",
          permissions: "Permissions",
          actions: "Actions",
        },

        perms: {
          read: "View complaints",
          update: "Update complaints",
          reply: "Reply to complaints",
          departments: "Departments",
          users: "Users",
          aiSettings: "AI settings",
        },

        viewScope: {
          unassigned: "Only complaints without department",
          assignedNoDeps: "Selected departments (not defined)",
          assignedWithDeps: "Selected departments: {{deps}}",
          all: "All complaints",
        },

        viewScopeOption: {
          all: "Can see all complaints",
          assigned: "Can see complaints for selected departments only",
          unassigned: "Only complaints without assigned department",
        },

        fields: {
          username: "Username",
          role: "Role",
          password: "Password",
          passwordAgain: "Password (repeat)",
          nationalId11: "National ID (11 digits)",
          nationalIdOptional: "National ID (optional)",
          isStaff: "Staff status",
          canAccessAdmin: "This user can access the admin panel",
          viewScopeTitle: "Complaint view scope (staff)",
          viewableDepartments: "Departments the user can view",
          permissionsTitle: "Permissions (for staff / managers)",
          newPasswordOptional: "New password (optional)",
          newPasswordAgain: "New password (repeat)",
          isBlocked: "Blocked",
          blockLogin: "Block this user from logging in",
          isSpammer: "Spammer",
          spammerLabel: "Too many complaints / spam",
        },

        placeholders: {
          username: "username",
          password: "password",
          passwordAgain: "password again",
          nationalIdCitizenOnly: "Required for citizens only",
          newPasswordOptional: "Leave empty to keep unchanged",
          newPasswordAgain: "Repeat new password",
          nationalIdOptional: "11-digit national ID",
        },

        filters: {
          searchPlaceholder: "Search by username or national ID...",
          roles: {
            all: "All roles",
          },
          staff: {
            all: "All (staff / not)",
            onlyStaff: "Only is_staff = true",
            onlyNonStaff: "Only is_staff = false",
          },
          blocked: {
            all: "Block status: all",
            onlyBlocked: "Only blocked",
            onlyNotBlocked: "Only not blocked",
          },
        },

        newUserTitle: "Create new user",
        editUserTitle: "Edit user #{{id}} ({{username}})",
        noUsersForFilter: "No users match the current filters.",

        errors: {
          meLoad: "Failed to load current user info.",
          noAccess: "You do not have access to this page.",
          usersLoad: "Failed to load users.",
          userCreateFail: "Failed to create user.",
          userUpdateFail: "Failed to update user.",
          passwordsDontMatch: "Passwords do not match.",
          passwordTooShort: "Password must be at least 6 characters.",
          nationalIdCitizen11Digits:
            "National ID must be 11 digits for citizens.",
          create: {
            fillUsernameAndPassword:
              "Please fill in username and both password fields.",
          },
          newPasswordFillBoth: "Please fill in both new password fields.",
          newPasswordsDontMatch: "New passwords do not match.",
          newPasswordTooShort: "New password must be at least 6 characters.",
          nationalId11IfPresent:
            "If national ID is provided, it must be 11 digits.",
        },

        success: {
          userCreated: "User created successfully.",
          userUpdated: "User updated successfully.",
        },
      },

      systemSettings: {
        title: "AI & system settings",
        loading: "Loading...",
        subtitle:
          "Configure complaint routing, summarization, and spam filtering thresholds here.",
        back: "Back",
        saveSuccess: "Settings saved successfully.",
        errors: {
          onlyAdmins: "Only administrators can access this page.",
          loadFailed: "Failed to load settings.",
          saveFailed: "Failed to save settings.",
        },
        sections: {
          aiFeatures: {
            title: "AI features",
            help: "Enable or disable automatic summarization and routing based on complaint text.",
          },
          thresholds: {
            title: "Threshold values",
            help: "Define how strong the AI decision should be before it is applied.",
          },
          spamRules: {
            title: "Spam rules",
            help: "Limit how many complaints a single user can send in a short period.",
          },
          citizenAccounts: {
            title: "Citizen accounts",
            help: "Decide whether citizens can create accounts by themselves.",
          },
        },
        fields: {
          use_ai_summary: "Use AI summarization",
          use_ai_routing:
            "Automatically route complaints to related department",
          use_duplicate_detection: "Detect similar (duplicate) complaints",
          ai_min_confidence: {
            label: "AI confidence threshold (0–1)",
            hint: "e.g. 0.6 → if confidence is below 60%, the AI suggestion is ignored.",
          },
          similarity_threshold: {
            label: "Duplicate similarity threshold (0–1)",
            hint: "e.g. 0.8 → above 80% similarity is treated as duplicate.",
          },
          spam_max_per_day: {
            label: "Max complaints per day",
            hint: "When this limit is exceeded, the user is temporarily treated as spam.",
          },
          spam_max_per_hour: {
            label: "Max complaints per hour",
            hint: "Helps prevent very frequent back-to-back complaints.",
          },
          allow_citizen_registration:
            "Allow citizens to register through the system",
        },
        buttons: {
          save: "Save settings",
          saving: "Saving...",
        },
      },
      register: {
        heroKicker: "Smart Municipality",
        heroTitle: {
          main: "Citizen",
          highlight: "Registration",
        },
        heroText:
          "Online complaint system for Turkish citizens. Please enter a valid username and an 11-digit Turkish ID number.",

        fields: {
          username: "Username",
          nationalId: "Turkish ID number",
          password: "Password",
          passwordAgain: "Password (again)",
        },

        placeholders: {
          username: "Enter your username",
          nationalId: "11-digit ID number",
          password: "Choose a password",
          passwordAgain: "Type the password again",
        },

        buttons: {
          submitting: "Creating account...",
          submit: "Register",
          login: "Log in",
        },

        meta: {
          haveAccountQuestion: "Already have an account?",
        },

        errors: {
          fillAllFields: "Please fill in all fields.",
          passwordsDontMatch: "Passwords do not match.",
          nationalId11Digits: "Turkish ID number must be 11 digits.",
          genericFail: "Registration failed. Please try again.",
        },

        success: {
          registered: "Registration successful. You can now log in.",
        },
      },
      complaints: {
        status: {
          submitted: "Submitted",
          new: "New",
          inReview: "In review",
          closed: "Closed",
        },
      },

      newComplaint: {
        loggedInAs: "Signed in as:",
        roleLabel: "Role:",
        form: {
          title: "Complaint form",
          help: "Please describe the problem as clearly as possible in Turkish or Arabic.",
        },
        fields: {
          text: "Complaint text",
          department: "Department selection",
        },
        placeholders: {
          text: "Example: The street lights in our neighborhood are not working, it gets very dark in the evenings...",
        },
        hints: {
          noAbuse: "Please avoid insults, swearing, or sharing personal data.",
          departmentWithAi:
            "You may leave the department empty; the system will try to route the complaint to the most appropriate unit.",
          departmentWithoutAi:
            "Since AI routing is disabled, selecting a department is mandatory.",
        },
        department: {
          auto: "— Automatic (let AI route) —",
          choose: "— Select a department —",
        },
        buttons: {
          submit: "Submit complaint",
          submitting: "Submitting...",
        },
        errors: {
          emptyText: "Please write your complaint text.",
          departmentRequiredWhenAiOff:
            "When AI is disabled, selecting a department is required.",
          genericFail: "An error occurred while creating your complaint.",
        },
        success: {
          created: "Your complaint has been recorded successfully.",
        },
        side: {
          title: "About the system",
          items: {
            trackStatus:
              "After your complaint is recorded, you can track its status from the {{page}} page.",
            statusFlow: "Statuses: {{new}} → {{inReview}} → {{closed}}.",
            adminCanRoute:
              "An administrator may forward your complaint to the relevant department and contact you if needed.",
            aiDuplicates:
              "If AI is enabled, similar complaints may be detected and marked as duplicates.",
          },
        },
      },
      login: {
        brand: {
          kicker: "Smart Municipality",
          titleMain: "Smart Complaint",
          titleHighlight: "System",
          subtitle:
            "AI-assisted routing, Turkish summaries, and a clear dashboard for admins, staff, and citizens.",
        },
        pills: {
          aiRouting: "AI-powered routing",
          duplicateDetection: "Duplicate complaint detection",
          spamProtection: "Spam protection",
        },
        form: {
          title: "Sign in",
          caption: "Sign in with your admin, staff, or citizen account.",
        },
        fields: {
          username: "Username",
          password: "Password",
        },
        placeholders: {
          username: "Enter your username",
          password: "Enter your password",
        },
        buttons: {
          login: "Sign in",
          loggingIn: "Signing in...",
        },
        registerPrompt: {
          text: "Don’t have an account yet?",
          button: "Register as a citizen",
        },
        info: {
          managedAccounts:
            "Citizen accounts are managed by the municipality system.",
        },
        errors: {
          invalidCreds: "Incorrect username or password.",
          generic: "Login failed. Please try again.",
        },
      },
      departments: {
        title: "Departments",
        subtitle:
          "Add, update and remove service departments used in the municipality.",
        loggedInAs: "Signed in as:",
        roleLabel: "Role:",
        role: {
          staffOrManager: "Manager / Staff",
        },
        errors: {
          meLoad: "Failed to load user information.",
          noAccess: "You do not have permission to access this page.",
          noAccessAlert:
            "This page is only for managers and municipality staff.",
          loadFailed: "Failed to load departments.",
          validationNameCodeRequired:
            "Turkish name and code are required fields.",
          saveFailedWithDetails: "Save error: {{details}}",
          saveFailed: "Department could not be saved.",
          deleteFailed: "Department could not be deleted.",
        },
        success: {
          created: "New department created.",
          updated: "Department updated successfully.",
          deleted: "Department deleted.",
        },
        confirm: {
          delete: 'Are you sure you want to delete "{{name}}"?',
        },
        form: {
          titleNew: "Add new department",
          titleEdit: "Edit department (#{{id}})",
        },
        fields: {
          name_tr: "Turkish name",
          code: "Code",
          name_ar_optional: "Arabic name (optional)",
        },
        placeholders: {
          name_tr: "e.g. Municipality",
          code: "e.g. MUNIC, HEALTH",
          name_ar: "e.g. البلدية",
        },
        search: {
          placeholder: "Search by name, code or Arabic name...",
        },
        empty: "No departments have been defined yet.",
        table: {
          columns: {
            id: "ID",
            name_tr: "Turkish name",
            code: "Code",
            name_ar: "Arabic name",
            actions: "Actions",
          },
          noData: "No departments to display.",
        },
      },
      dashboard: {
        title: {
          staff: "Admin dashboard",
          citizen: "My complaints",
        },
        header: {
          loggedInAs: "Signed in as:",
          role: "Role:",
        },
        errors: {
          loadFailed: "Failed to load complaints.",
        },
        status: {
          submitted: "Submitted",
          new: "New",
          in_review: "In review",
          closed: "Closed",
        },
        source: {
          duplicate: "Duplicate #{{index}}",
          ai: "AI",
          manual: "Manual",
        },
        department: {
          pendingReview: "Under review",
        },
        stats: {
          total: {
            staffLabel: "Total complaints",
            citizenLabel: "My total complaints",
            staffHint: "Total number of complaints in the system.",
            citizenHint:
              "Number of complaints you submitted with this account.",
          },
          waiting: {
            label: "Pending complaints",
            hint: 'Complaints with status "New" or "In review".',
          },
          aiUsed: {
            label: "AI-processed complaints",
            hint: "Complaints where automatic summarization/routing was used.",
          },
          duplicates: {
            label: "Duplicate complaints",
            hint: "Complaint records created from similar content.",
          },
        },
        table: {
          searchPlaceholder: "Search by text, citizen or department...",
          noData: "No complaints to display.",
          columns: {
            id: "ID",
            citizen: "Citizen",
            date: "Date",
            status: "Status",
            department: "Department",
            source: "Source",
            confidence: "Confidence",
            complaint: "Complaint",
            actions: "Actions",
          },
          actions: {
            details: "Details",
          },
        },
      },
      complaintDetail: {
        title: {
          staff: "Complaint details",
          citizen: "My complaint",
        },
        loading: "Loading...",
        errors: {
          notFound: "Complaint not found.",
          loadFailed: "Failed to load complaint details.",
        },
        header: {
          idLabel: "ID:",
          dateMissing: "No date",
          citizenLabel: "Citizen:",
        },
        cards: {
          status: {
            label: "Status",
            hint: "Processing status of the complaint (New / In review / Closed).",
            createdAt: "Created at:",
            inReviewAt: "Moved to review:",
            closedAt: "Closed at:",
          },
          department: {
            label: "Department",
            unassigned: "Unassigned",
            hint: "Municipal department / institution to which the complaint is routed.",
          },
          source: {
            label: "Source",
            hint: "Information on whether the complaint is duplicate / AI-classified / manual.",
          },
          confidence: {
            label: "Model confidence",
            hint: "The AI model confidence score for routing the complaint to this department.",
          },
        },
        readOnly: {
          title: "Complaint text",
        },
        edit: {
          title: "Edit complaint",
          fields: {
            status: "Status",
            department: "Department",
            text: "Complaint text",
            summary: "Summary (AI)",
            summaryPlaceholder:
              "You can adjust the summary manually if needed.",
          },
          buttons: {
            saving: "Saving...",
            save: "Save",
            cancel: "Cancel",
          },
        },
        messages: {
          updateSuccess: "Complaint updated.",
          updateError: "Update failed. Please try again.",
        },
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANG_STORAGE_KEY, lng);
  }
  applyDocumentLanguage(lng);
});

applyDocumentLanguage(i18n.language);

export default i18n;
