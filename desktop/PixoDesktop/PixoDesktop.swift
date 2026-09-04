import Cocoa

private enum ReminderKind: String {
    case water
    case meal

    var title: String {
        switch self {
        case .water: return "Tiny water break?"
        case .meal: return "It’s time to eat."
        }
    }

    var message: String {
        switch self {
        case .water: return "A few sips now. Your ideas can wait thirty seconds."
        case .meal: return "Let’s pause for food before the next big idea."
        }
    }
}

private enum PixoDefaults {
    static let waterTimes = "waterTimes"
    static let mealTime = "mealTime"
    static let remindersEnabled = "remindersEnabled"
    static let lastReminder = "lastReminder"

    static func register() {
        UserDefaults.standard.register(defaults: [
            waterTimes: "10:30,13:00,15:30",
            mealTime: "17:00",
            remindersEnabled: true,
            lastReminder: "",
        ])
    }
}

private func pixoImage() -> NSImage? {
    guard let path = Bundle.main.path(forResource: "pixo_2d", ofType: "png") else { return nil }
    return NSImage(contentsOfFile: path)
}

private func makeLabel(
    _ text: String,
    size: CGFloat,
    weight: NSFont.Weight = .regular,
    color: NSColor = .labelColor
) -> NSTextField {
    let label = NSTextField(labelWithString: text)
    label.font = NSFont.systemFont(ofSize: size, weight: weight)
    label.textColor = color
    label.isEditable = false
    label.isBordered = false
    label.drawsBackground = false
    return label
}

private final class ReminderPanelController: NSWindowController {
    private let titleLabel = makeLabel("Tiny water break?", size: 22, weight: .bold)
    private let messageLabel = makeLabel("A few sips now.", size: 14, color: .secondaryLabelColor)
    private var currentKind: ReminderKind = .water
    var onSnooze: ((ReminderKind) -> Void)?

    init() {
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 510, height: 330),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.level = .floating
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.isMovableByWindowBackground = true
        super.init(window: panel)
        buildContent()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func buildContent() {
        guard let panel = window else { return }
        let root = NSView(frame: panel.contentView?.bounds ?? .zero)
        root.wantsLayer = true
        root.layer?.backgroundColor = NSColor.clear.cgColor

        let imageView = NSImageView(frame: NSRect(x: 6, y: 0, width: 230, height: 292))
        imageView.image = pixoImage()
        imageView.imageScaling = .scaleProportionallyUpOrDown
        imageView.animates = true

        let bubble = NSVisualEffectView(frame: NSRect(x: 195, y: 70, width: 302, height: 195))
        bubble.material = .popover
        bubble.blendingMode = .behindWindow
        bubble.state = .active
        bubble.wantsLayer = true
        bubble.layer?.cornerRadius = 24
        bubble.layer?.borderWidth = 1
        bubble.layer?.borderColor = NSColor.separatorColor.withAlphaComponent(0.3).cgColor
        bubble.layer?.shadowColor = NSColor.black.cgColor
        bubble.layer?.shadowOpacity = 0.18
        bubble.layer?.shadowRadius = 24
        bubble.layer?.shadowOffset = NSSize(width: 0, height: -8)

        let kicker = makeLabel("A NOTE FROM PIXO", size: 10, weight: .bold, color: .secondaryLabelColor)
        kicker.frame = NSRect(x: 25, y: 153, width: 220, height: 18)
        titleLabel.frame = NSRect(x: 25, y: 113, width: 245, height: 33)
        messageLabel.frame = NSRect(x: 25, y: 67, width: 245, height: 44)
        messageLabel.maximumNumberOfLines = 2
        messageLabel.lineBreakMode = .byWordWrapping

        let done = NSButton(title: "Done, Pixo", target: self, action: #selector(doneTapped))
        done.frame = NSRect(x: 24, y: 20, width: 108, height: 34)
        done.bezelStyle = .rounded
        done.keyEquivalent = "\r"

        let snooze = NSButton(title: "10 more minutes", target: self, action: #selector(snoozeTapped))
        snooze.frame = NSRect(x: 139, y: 20, width: 120, height: 34)
        snooze.bezelStyle = .inline

        let close = NSButton(title: "×", target: self, action: #selector(doneTapped))
        close.frame = NSRect(x: 260, y: 153, width: 24, height: 24)
        close.isBordered = false
        close.font = NSFont.systemFont(ofSize: 18, weight: .medium)

        bubble.addSubview(kicker)
        bubble.addSubview(titleLabel)
        bubble.addSubview(messageLabel)
        bubble.addSubview(done)
        bubble.addSubview(snooze)
        bubble.addSubview(close)
        root.addSubview(bubble)
        root.addSubview(imageView)
        panel.contentView = root
    }

    func show(kind: ReminderKind) {
        currentKind = kind
        titleLabel.stringValue = kind.title
        messageLabel.stringValue = kind.message

        if let screen = NSScreen.main ?? NSScreen.screens.first, let panel = window {
            let visible = screen.visibleFrame
            panel.setFrameOrigin(NSPoint(x: visible.maxX - panel.frame.width - 22, y: visible.minY + 18))
            panel.alphaValue = 0
            panel.orderFrontRegardless()
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.28
                panel.animator().alphaValue = 1
            }
        }
        NSSound(named: "Glass")?.play()
    }

    @objc private func doneTapped() {
        window?.orderOut(nil)
    }

    @objc private func snoozeTapped() {
        let kind = currentKind
        window?.orderOut(nil)
        onSnooze?(kind)
    }
}

private final class SettingsWindowController: NSWindowController {
    private let waterField = NSTextField(string: "")
    private let mealField = NSTextField(string: "")
    private let enabledCheckbox = NSButton(checkboxWithTitle: "Let Pixo appear for care reminders", target: nil, action: nil)
    var onSave: (() -> Void)?
    var onTest: (() -> Void)?

    init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 480, height: 510),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Pixo Reminder Settings"
        window.isReleasedWhenClosed = false
        window.center()
        super.init(window: window)
        buildContent()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func buildContent() {
        guard let content = window?.contentView else { return }

        let imageView = NSImageView(frame: NSRect(x: 28, y: 326, width: 126, height: 152))
        imageView.image = pixoImage()
        imageView.imageScaling = .scaleProportionallyUpOrDown

        let title = makeLabel("Pixo’s gentle reminders", size: 24, weight: .bold)
        title.frame = NSRect(x: 165, y: 421, width: 280, height: 34)
        let subtitle = makeLabel("Small check-ins that stay out of your way.", size: 13, color: .secondaryLabelColor)
        subtitle.frame = NSRect(x: 165, y: 390, width: 280, height: 24)

        enabledCheckbox.frame = NSRect(x: 32, y: 335, width: 360, height: 28)

        let waterLabel = makeLabel("Water reminder times", size: 12, weight: .semibold)
        waterLabel.frame = NSRect(x: 32, y: 287, width: 250, height: 20)
        waterField.frame = NSRect(x: 32, y: 248, width: 416, height: 32)
        waterField.placeholderString = "10:30, 13:00, 15:30"

        let waterHelp = makeLabel("Use 24-hour times separated by commas.", size: 11, color: .secondaryLabelColor)
        waterHelp.frame = NSRect(x: 34, y: 225, width: 300, height: 18)

        let mealLabel = makeLabel("Meal reminder time", size: 12, weight: .semibold)
        mealLabel.frame = NSRect(x: 32, y: 184, width: 250, height: 20)
        mealField.frame = NSRect(x: 32, y: 145, width: 416, height: 32)
        mealField.placeholderString = "17:00"

        let test = NSButton(title: "Show a test reminder", target: self, action: #selector(testTapped))
        test.frame = NSRect(x: 32, y: 76, width: 170, height: 38)
        test.bezelStyle = .rounded

        let save = NSButton(title: "Save schedule", target: self, action: #selector(saveTapped))
        save.frame = NSRect(x: 304, y: 76, width: 144, height: 38)
        save.bezelStyle = .rounded
        save.keyEquivalent = "\r"

        [imageView, title, subtitle, enabledCheckbox, waterLabel, waterField, waterHelp, mealLabel, mealField, test, save].forEach(content.addSubview)
    }

    func refresh() {
        waterField.stringValue = UserDefaults.standard.string(forKey: PixoDefaults.waterTimes) ?? "10:30,13:00,15:30"
        mealField.stringValue = UserDefaults.standard.string(forKey: PixoDefaults.mealTime) ?? "17:00"
        enabledCheckbox.state = UserDefaults.standard.bool(forKey: PixoDefaults.remindersEnabled) ? .on : .off
    }

    func present() {
        refresh()
        NSApp.activate(ignoringOtherApps: true)
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
    }

    @objc private func saveTapped() {
        let waterTimes = waterField.stringValue
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { $0.range(of: #"^([01]\d|2[0-3]):[0-5]\d$"#, options: .regularExpression) != nil }
        let meal = mealField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        UserDefaults.standard.set(waterTimes.isEmpty ? "10:30,13:00,15:30" : waterTimes.joined(separator: ","), forKey: PixoDefaults.waterTimes)
        UserDefaults.standard.set(meal.range(of: #"^([01]\d|2[0-3]):[0-5]\d$"#, options: .regularExpression) == nil ? "17:00" : meal, forKey: PixoDefaults.mealTime)
        UserDefaults.standard.set(enabledCheckbox.state == .on, forKey: PixoDefaults.remindersEnabled)
        onSave?()
        window?.orderOut(nil)
    }

    @objc private func testTapped() {
        onTest?()
    }
}

private final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private let reminderPanel = ReminderPanelController()
    private let settingsWindow = SettingsWindowController()
    private var scheduleTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        PixoDefaults.register()
        NSApp.setActivationPolicy(.accessory)
        configureStatusItem()

        reminderPanel.onSnooze = { [weak self] kind in
            Timer.scheduledTimer(withTimeInterval: 10 * 60, repeats: false) { [weak self] _ in
                self?.reminderPanel.show(kind: kind)
            }
        }
        settingsWindow.onTest = { [weak self] in self?.reminderPanel.show(kind: .water) }
        settingsWindow.onSave = { [weak self] in self?.refreshStatusMenu() }

        checkSchedule()
        scheduleTimer = Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in
            self?.checkSchedule()
        }

        if CommandLine.arguments.contains("--test-reminder") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
                self?.reminderPanel.show(kind: .water)
            }
        } else if CommandLine.arguments.contains("--settings") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
                self?.settingsWindow.present()
            }
        }
    }

    private func configureStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let image = pixoImage() {
            image.size = NSSize(width: 22, height: 22)
            image.isTemplate = false
            statusItem.button?.image = image
            statusItem.button?.imageScaling = .scaleProportionallyDown
        } else {
            statusItem.button?.title = "P"
        }
        statusItem.button?.toolTip = "Pixo is here"
        refreshStatusMenu()
    }

    private func refreshStatusMenu() {
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Show Pixo", action: #selector(showPixo), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "Reminder Settings…", action: #selector(openSettings), keyEquivalent: ","))
        menu.addItem(.separator())

        let schedule = NSMenuItem(title: scheduleSummary(), action: nil, keyEquivalent: "")
        schedule.isEnabled = false
        menu.addItem(schedule)

        let login = NSMenuItem(title: "Starts automatically at login", action: nil, keyEquivalent: "")
        login.isEnabled = false
        menu.addItem(login)
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit Pixo", action: #selector(quit), keyEquivalent: "q"))

        for item in menu.items where item.action != nil { item.target = self }
        statusItem.menu = menu
    }

    private func scheduleSummary() -> String {
        if !UserDefaults.standard.bool(forKey: PixoDefaults.remindersEnabled) { return "Reminders are paused" }
        let meal = UserDefaults.standard.string(forKey: PixoDefaults.mealTime) ?? "17:00"
        return "Dinner \(prettyTime(meal)) · Water reminders on"
    }

    private func prettyTime(_ time: String) -> String {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2 else { return time }
        let suffix = parts[0] >= 12 ? "PM" : "AM"
        let hour = parts[0] % 12 == 0 ? 12 : parts[0] % 12
        return String(format: "%d:%02d %@", hour, parts[1], suffix)
    }

    private func checkSchedule() {
        guard UserDefaults.standard.bool(forKey: PixoDefaults.remindersEnabled) else { return }
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        let currentTime = formatter.string(from: Date())

        let waterTimes = (UserDefaults.standard.string(forKey: PixoDefaults.waterTimes) ?? "")
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        let mealTime = UserDefaults.standard.string(forKey: PixoDefaults.mealTime) ?? "17:00"
        let kind: ReminderKind?
        if currentTime == mealTime {
            kind = .meal
        } else if waterTimes.contains(currentTime) {
            kind = .water
        } else {
            kind = nil
        }

        guard let kind else { return }
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "yyyy-MM-dd"
        let key = "\(dayFormatter.string(from: Date()))-\(currentTime)-\(kind.rawValue)"
        guard UserDefaults.standard.string(forKey: PixoDefaults.lastReminder) != key else { return }
        UserDefaults.standard.set(key, forKey: PixoDefaults.lastReminder)
        reminderPanel.show(kind: kind)
    }

    @objc private func showPixo() {
        reminderPanel.show(kind: .water)
    }

    @objc private func openSettings() {
        settingsWindow.present()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}

let application = NSApplication.shared
private let delegate = AppDelegate()
application.delegate = delegate
application.run()
